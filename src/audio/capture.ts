/**
 * Microphone capture. Streams raw PCM samples from the mic (via expo-audio's
 * useAudioStream), feeds them to a pitch tracker as they arrive, and turns the
 * collected frames into notes when the user stops.
 *
 * There are two modes:
 *   - 'voice': PitchTracker (YIN), for one note at a time. Every frame is
 *     final as soon as it is analyzed.
 *   - 'song': MelodyTracker, for a melody inside recorded music. Frames from
 *     push() are only a preview; the real melody is chosen in finish(),
 *     because the tracker looks at the whole recording at once.
 *
 * Analyzing while recording means there is no wait at the end, and it gives us
 * a live pitch reading to show on screen.
 *
 * After Stop, the notes and the recording are saved automatically, so they
 * appear in History and the recording can be shared.
 */

import {
  AudioModule,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  type AudioStreamBuffer,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

import {
  MelodyTracker,
  notesFromFrames,
  PitchTracker,
  type DetectedNote,
  type PitchFrame,
  type TranscribeMode,
} from '@/dsp';
import { saveTranscription, type SavedTranscription } from '@/storage/transcriptions';

/** Recording stops automatically after this many seconds. */
export const MAX_RECORDING_SECONDS = 30;

/** We ask for 44.1 kHz, but the phone may deliver another rate (often 48 kHz). */
const REQUESTED_SAMPLE_RATE = 44100;

/** Update the screen at most this often, so React is not re-rendering 86 times a second. */
const UI_UPDATE_INTERVAL_MS = 66;

/**
 * True when the installed native code supports mic streaming. Older builds of
 * Expo Go may not include it; in that case the app needs a development build.
 */
// AudioModule is an object, not a namespace import, so this lint rule does not apply.
// eslint-disable-next-line import/namespace
export const isStreamingSupported = typeof AudioModule?.AudioStream === 'function';

export type CaptureStatus = 'idle' | 'listening' | 'permission-denied' | 'error';

export interface CaptureResult {
  notes: DetectedNote[];
  /** Which tracker produced the notes. */
  mode: TranscribeMode;
  /** Length of the recording in seconds. */
  duration: number;
  sampleRate: number;
  /** The saved copy, or null if saving failed. */
  saved: SavedTranscription | null;
}

/** What the screen shows while listening. */
export interface LiveSnapshot {
  pitch: PitchFrame;
  /** Seconds recorded so far. */
  elapsed: number;
  /** Time spent on pitch detection divided by audio time. Above 1 means the phone cannot keep up. */
  dspLoad: number;
}

/** Mix interleaved multi-channel samples down to mono by averaging. */
function toMono(samples: Float32Array, channels: number): Float32Array {
  if (channels <= 1) return samples;
  const mono = new Float32Array(Math.floor(samples.length / channels));
  for (let i = 0; i < mono.length; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += samples[i * channels + c];
    mono[i] = sum / channels;
  }
  return mono;
}

/** Everything that belongs to one recording, from Listen to Stop. */
class CaptureSession {
  audioSeconds = 0;
  private tracker: PitchTracker | MelodyTracker | null = null;
  /** Voice mode only: the frames collected so far. */
  private frames: PitchFrame[] = [];
  /** The raw mono audio, kept so it can be saved as a WAV file. */
  private chunks: Float32Array[] = [];
  private processingMs = 0;
  private lastUiUpdate = 0;

  constructor(readonly mode: TranscribeMode) {}

  /** Analyze one buffer from the mic. Returns a snapshot when it is time to refresh the screen. */
  addBuffer(buffer: AudioStreamBuffer): LiveSnapshot | null {
    // The first buffer tells us the real sample rate.
    this.tracker ??=
      this.mode === 'song' ? new MelodyTracker(buffer.sampleRate) : new PitchTracker(buffer.sampleRate);
    const samples = toMono(new Float32Array(buffer.data), buffer.channels);
    this.chunks.push(samples);

    const startedAt = performance.now();
    const frames = this.tracker.push(samples);
    this.processingMs += performance.now() - startedAt;
    this.audioSeconds += samples.length / buffer.sampleRate;
    // MelodyTracker keeps its own history, so only voice mode stores frames here.
    if (this.tracker instanceof PitchTracker) this.frames.push(...frames);

    const now = Date.now();
    if (frames.length === 0 || now - this.lastUiUpdate < UI_UPDATE_INTERVAL_MS) {
      return null;
    }
    this.lastUiUpdate = now;
    return {
      pitch: frames[frames.length - 1],
      elapsed: this.audioSeconds,
      dspLoad: this.processingMs / (this.audioSeconds * 1000),
    };
  }

  /** All the audio received, joined into one buffer. */
  private recording(): Float32Array {
    const total = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const samples = new Float32Array(total);
    let offset = 0;
    for (const chunk of this.chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    return samples;
  }

  /** Group everything heard into notes and save them. Null if no audio arrived. */
  finish(): CaptureResult | null {
    if (!this.tracker) return null;
    const frames = this.tracker instanceof MelodyTracker ? this.tracker.finish() : this.frames;
    const result = {
      notes: notesFromFrames(frames, this.tracker.hopSeconds),
      mode: this.mode,
      duration: this.audioSeconds,
      sampleRate: this.tracker.sampleRate,
    };

    let saved: SavedTranscription | null = null;
    try {
      saved = saveTranscription(result, { samples: this.recording(), sampleRate: result.sampleRate });
    } catch (error) {
      // Still show the result on screen; it just will not be in History.
      console.warn('Could not save the transcription', error);
    }
    return { ...result, saved };
  }
}

export function useMelodyCapture() {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [mode, setMode] = useState<TranscribeMode>('voice');
  const session = useRef<CaptureSession | null>(null);

  const { stream } = useAudioStream({
    sampleRate: REQUESTED_SAMPLE_RATE,
    channels: 1,
    encoding: 'float32',
    onBuffer: (buffer) => {
      const current = session.current;
      if (!current) return;
      const snapshot = current.addBuffer(buffer);
      if (snapshot) setLive(snapshot);
      if (current.audioSeconds >= MAX_RECORDING_SECONDS) stop();
    },
  });

  async function start(nextMode: TranscribeMode) {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus('permission-denied');
        return;
      }
      // iOS needs the audio session switched to recording mode.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      session.current = new CaptureSession(nextMode);
      setMode(nextMode);
      setResult(null);
      setLive(null);
      await stream.start();
      setStatus('listening');
    } catch (error) {
      console.warn('Could not start the microphone', error);
      session.current = null;
      setStatus('error');
    }
  }

  function stop() {
    const current = session.current;
    if (!current) return;
    session.current = null;
    stream.stop();
    // Switch back to playback mode so later playback uses the loudspeaker on iOS.
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});

    setStatus('idle');
    setLive(null);
    setResult(current.finish());
  }

  // Release the microphone if the screen goes away mid-recording.
  useEffect(() => {
    return () => {
      if (session.current) {
        session.current = null;
        stream.stop();
      }
    };
  }, [stream]);

  return {
    status,
    /** Mode of the recording in progress, or of the last one. */
    mode,
    livePitch: live?.pitch ?? null,
    elapsed: live?.elapsed ?? 0,
    dspLoad: live?.dspLoad ?? 0,
    result,
    start,
    stop,
  };
}
