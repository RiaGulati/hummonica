/**
 * Splits a stream of audio samples into overlapping frames and runs pitch
 * detection on each one.
 *
 * The microphone delivers audio in chunks of arbitrary size. The tracker
 * buffers them and, whenever a full frame is available, analyzes it and then
 * moves forward by one "hop". With a 2048-sample frame and a 512-sample hop,
 * consecutive frames overlap by 75%, giving about 86 pitch readings per second
 * at 44.1 kHz while each reading still sees about 46 ms of audio (enough for
 * several periods of a low note).
 *
 * The same class is used for live microphone input (push chunks as they
 * arrive) and for a whole recording or file (push everything at once).
 */

import { frequencyToMidi } from './notes';
import { DEFAULT_YIN_OPTIONS, detectPitch, type YinOptions } from './yin';

export interface PitchFrame {
  /** Time of the centre of the frame, in seconds from the start of the audio. */
  time: number;
  /** Detected frequency in Hz, or 0 when the frame was too quiet to analyze. */
  frequency: number;
  /** YIN confidence from 0 to 1. */
  confidence: number;
  /** Loudness: root mean square of the samples (0 = silence, about 0.7 = full-scale sine). */
  rms: number;
  /** True when the frame is loud and periodic enough to trust its pitch. */
  voiced: boolean;
  /** Fractional MIDI value of the pitch, or NaN when not voiced. */
  midi: number;
}

export interface TrackerOptions {
  frameSize?: number;
  hopSize?: number;
  /** Frames with lower YIN confidence are marked unvoiced. */
  minConfidence?: number;
  /** Frames quieter than this RMS are treated as silence (0.01 is about -40 dB). */
  minRms?: number;
  yin?: YinOptions;
}

export const DEFAULT_TRACKER_OPTIONS = {
  frameSize: 2048,
  hopSize: 512,
  minConfidence: 0.8,
  minRms: 0.01,
};

/** Root mean square: a simple measure of how loud a block of samples is. */
export function rms(samples: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

export class PitchTracker {
  readonly frameSize: number;
  readonly hopSize: number;
  private readonly minConfidence: number;
  private readonly minRms: number;
  private readonly yin: Required<YinOptions>;

  /** Samples received but not yet fully consumed by frames. */
  private buffer = new Float32Array(0);
  /** Position of buffer[0] within the whole stream, counted in samples. */
  private bufferStart = 0;

  constructor(
    readonly sampleRate: number,
    options: TrackerOptions = {}
  ) {
    this.frameSize = options.frameSize ?? DEFAULT_TRACKER_OPTIONS.frameSize;
    this.hopSize = options.hopSize ?? DEFAULT_TRACKER_OPTIONS.hopSize;
    this.minConfidence = options.minConfidence ?? DEFAULT_TRACKER_OPTIONS.minConfidence;
    this.minRms = options.minRms ?? DEFAULT_TRACKER_OPTIONS.minRms;
    this.yin = { ...DEFAULT_YIN_OPTIONS, ...options.yin };
  }

  /** Seconds between consecutive frames. */
  get hopSeconds(): number {
    return this.hopSize / this.sampleRate;
  }

  /** Add new samples and return the frames that became complete. */
  push(chunk: Float32Array): PitchFrame[] {
    const combined = new Float32Array(this.buffer.length + chunk.length);
    combined.set(this.buffer, 0);
    combined.set(chunk, this.buffer.length);

    const frames: PitchFrame[] = [];
    let offset = 0;
    while (offset + this.frameSize <= combined.length) {
      const frame = combined.subarray(offset, offset + this.frameSize);
      frames.push(this.analyze(frame, this.bufferStart + offset));
      offset += this.hopSize;
    }

    // Keep the leftover samples. They are the start of the next frame.
    this.buffer = combined.slice(offset);
    this.bufferStart += offset;
    return frames;
  }

  private analyze(frame: Float32Array, startSample: number): PitchFrame {
    const time = (startSample + this.frameSize / 2) / this.sampleRate;
    const loudness = rms(frame);

    // Skip the expensive YIN step for silent frames.
    if (loudness < this.minRms) {
      return { time, frequency: 0, confidence: 0, rms: loudness, voiced: false, midi: NaN };
    }

    const { frequency, confidence } = detectPitch(frame, this.sampleRate, this.yin);
    const voiced =
      confidence >= this.minConfidence &&
      frequency >= this.yin.minFrequency &&
      frequency <= this.yin.maxFrequency;

    return {
      time,
      frequency,
      confidence,
      rms: loudness,
      voiced,
      midi: voiced ? frequencyToMidi(frequency) : NaN,
    };
  }
}
