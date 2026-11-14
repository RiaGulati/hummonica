/**
 * Playback of a transcription, with the current note highlighted.
 *
 * Two things can be played:
 *   - 'tab': the notes of the tab, played with recordings of a real
 *     harmonica (sampler.ts), so you can hear what you are about to play. If
 *     the samples cannot be loaded, a synthesized reed voice (reed.ts) is
 *     used instead. The audio is generated in TypeScript, encoded as WAV
 *     (wav.ts) and handed to the player as a file (or a blob: URL on web),
 *     because the audio player plays addresses; see playback-file.ts.
 *   - 'recording': the original recording, to compare the tab with what was
 *     actually heard.
 *
 * Highlighting: the player reports its position (currentTime) every 50 ms.
 * We convert that to the time line of the notes and look up which note is
 * sounding with entryIndexAt.
 */

import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';

import { renderReedNote } from '@/dsp/reed';
import { renderSampledNote } from '@/dsp/sampler';
import { renderNotes, type NoteVoice } from '@/dsp/synth';
import { encodeWav } from '@/dsp/wav';
import { entryIndexAt, type Tab } from '@/harmonica';

import { loadHarmonicaSamples } from './harmonica-samples';
import { storePlaybackWav } from './playback-file';

export type PlaybackSource = 'tab' | 'recording';

/** The rate of the harmonica samples, so they play back without losing quality. */
const PLAYBACK_SAMPLE_RATE = 44100;
/** Silence before the first note, so playback does not start abruptly. */
const LEAD_IN_SECONDS = 0.2;

/** The real harmonica samples, or the synthesized reed voice if they cannot be loaded. */
async function harmonicaVoice(): Promise<NoteVoice> {
  try {
    const bank = await loadHarmonicaSamples();
    return (frequency, duration, rate) => renderSampledNote(bank, frequency, duration, rate);
  } catch (error) {
    console.warn('Harmonica samples not available, using the synthesized voice', error);
    return renderReedNote;
  }
}

/**
 * Render the tab and write it to the cache. Returns the file address and
 * the time offset: note time = player time + offset.
 */
async function writeTabAudio(tab: Tab): Promise<{ uri: string; offset: number }> {
  const firstStart = tab.entries[0]?.start ?? 0;
  const offset = firstStart - LEAD_IN_SECONDS;
  const notes = tab.entries.map((entry) => ({
    midi: entry.midi,
    start: entry.start - offset,
    duration: entry.duration,
  }));
  const samples = renderNotes(notes, PLAYBACK_SAMPLE_RATE, await harmonicaVoice());

  return { uri: storePlaybackWav(encodeWav(samples, PLAYBACK_SAMPLE_RATE)), offset };
}

export function usePlayback(tab: Tab, recordingUri: string | null) {
  const player = useAudioPlayer(null, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const [source, setSource] = useState<PlaybackSource | null>(null);
  const [offset, setOffset] = useState(0);

  const atEnd = status.duration > 0 && status.currentTime >= status.duration - 0.05;

  /** Play, pause or resume the given source (the button toggles). */
  async function toggle(next: PlaybackSource) {
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
      try {
        ({ uri, offset: nextOffset } = await writeTabAudio(tab));
      } catch (error) {
        console.warn('Could not prepare the tab audio', error);
        return;
      }
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
