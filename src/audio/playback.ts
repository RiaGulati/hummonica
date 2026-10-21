/**
 * Playback of a transcription, with the current note highlighted.
 *
 * Two things can be played:
 *   - 'tab': the notes of the tab, synthesized with a harmonica-like tone
 *     (synth.ts), so you can hear what you are about to play. The audio is
 *     generated in TypeScript, encoded as WAV (wav.ts) and written to the
 *     cache folder, because the audio player plays files.
 *   - 'recording': the original recording, to compare the tab with what was
 *     actually heard.
 *
 * Highlighting: the player reports its position (currentTime) every 50 ms.
 * We convert that to the time line of the notes and look up which note is
 * sounding with entryIndexAt.
 */

import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useState } from 'react';

import { renderNotes } from '@/dsp/synth';
import { encodeWav } from '@/dsp/wav';
import { entryIndexAt, type Tab } from '@/harmonica';

export type PlaybackSource = 'tab' | 'recording';

/** A lower rate than the microphone is plenty for synthesized tones, and makes smaller files. */
const SYNTH_SAMPLE_RATE = 22050;
/** Silence before the first note, so playback does not start abruptly. */
const LEAD_IN_SECONDS = 0.2;
/** Harmonica-like tone: strong upper harmonics, quick fade in and out. */
const HARMONICA_TONE = { amplitude: 0.4, harmonics: [1, 0.7, 0.5, 0.3, 0.2], fadeMs: 15 };

/** Each synthesized file gets a new name, so the player never reads a half-written file. */
let synthCounter = 0;
let lastSynthFile: File | null = null;

/**
 * Synthesize the tab and write it to the cache. Returns the file address and
 * the time offset: note time = player time + offset.
 */
function writeTabAudio(tab: Tab): { uri: string; offset: number } {
  const firstStart = tab.entries[0]?.start ?? 0;
  const offset = firstStart - LEAD_IN_SECONDS;
  const notes = tab.entries.map((entry) => ({
    midi: entry.midi,
    start: entry.start - offset,
    duration: entry.duration,
  }));
  const samples = renderNotes(notes, SYNTH_SAMPLE_RATE, HARMONICA_TONE);

  if (lastSynthFile?.exists) lastSynthFile.delete();
  const file = new File(Paths.cache, `tab-playback-${++synthCounter}.wav`);
  file.create({ overwrite: true });
  file.write(encodeWav(samples, SYNTH_SAMPLE_RATE));
  lastSynthFile = file;
  return { uri: file.uri, offset };
}

export function usePlayback(tab: Tab, recordingUri: string | null) {
  const player = useAudioPlayer(null, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const [source, setSource] = useState<PlaybackSource | null>(null);
  const [offset, setOffset] = useState(0);

  const atEnd = status.duration > 0 && status.currentTime >= status.duration - 0.05;

  /** Play, pause or resume the given source (the button toggles). */
  function toggle(next: PlaybackSource) {
    if (source === next) {
      if (status.playing) {
        player.pause();
      } else {
        if (atEnd) player.seekTo(0);
        player.play();
      }
      return;
    }

    let uri: string | null;
    let nextOffset = 0;
    if (next === 'tab') {
      ({ uri, offset: nextOffset } = writeTabAudio(tab));
    } else {
      uri = recordingUri;
    }
    if (!uri) return;
    player.replace({ uri });
    player.play();
    setSource(next);
    setOffset(nextOffset);
  }

  const active = source !== null && (status.playing || (status.currentTime > 0 && !atEnd));
  return {
    toggle,
    /** Which source is playing right now, or null. */
    playing: status.playing ? source : null,
    /** Index of the tab entry to highlight, or -1. */
    activeIndex: active ? entryIndexAt(tab, status.currentTime + offset) : -1,
  };
}
