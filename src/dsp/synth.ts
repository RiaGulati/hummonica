/**
 * Simple tone synthesizer. Used by the tests to create audio with known
 * pitches, and later by playback to let the user hear the detected melody.
 */

import { midiToFrequency } from './notes';

export interface ToneOptions {
  /** Peak level from 0 to 1. */
  amplitude?: number;
  /**
   * Relative strengths of the harmonics. [1] is a pure sine wave. [1, 0.5, 0.25]
   * adds the 2nd and 3rd harmonics, which sounds more like a voice or
   * harmonica and is a harder test for the pitch detector.
   */
  harmonics?: number[];
  /** Length of the fade in and fade out, in ms. Prevents clicks at the edges. */
  fadeMs?: number;
  /** Starting phase in radians. */
  phase?: number;
}

/** Render one tone of the given frequency and length. */
export function renderTone(
  frequency: number,
  durationSeconds: number,
  sampleRate: number,
  options: ToneOptions = {}
): Float32Array {
  const { amplitude = 0.5, harmonics = [1], fadeMs = 10, phase = 0 } = options;
  const length = Math.round(durationSeconds * sampleRate);
  const fadeLength = Math.min(Math.round((fadeMs / 1000) * sampleRate), Math.floor(length / 2));
  const harmonicTotal = harmonics.reduce((sum, h) => sum + Math.abs(h), 0) || 1;
  const output = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let value = 0;
    for (let h = 0; h < harmonics.length; h++) {
      value += harmonics[h] * Math.sin(2 * Math.PI * frequency * (h + 1) * t + phase);
    }
    // Linear fade at both ends.
    let envelope = 1;
    if (i < fadeLength) envelope = i / fadeLength;
    else if (i >= length - fadeLength) envelope = (length - 1 - i) / fadeLength;
    output[i] = (amplitude * envelope * value) / harmonicTotal;
  }
  return output;
}

export interface MelodyNote {
  /** MIDI note number, or null for a rest. */
  midi: number | null;
  /** Total time this note takes up, in seconds (including the gap after it). */
  duration: number;
}

export interface MelodyOptions extends ToneOptions {
  /** Silence at the end of each note, in seconds, like a player re-tonguing. */
  gap?: number;
}

/** Render a sequence of notes one after another into a single buffer. */
export function renderMelody(
  notes: MelodyNote[],
  sampleRate: number,
  options: MelodyOptions = {}
): Float32Array {
  const { gap = 0.05, ...toneOptions } = options;
  const totalLength = notes.reduce((sum, n) => sum + Math.round(n.duration * sampleRate), 0);
  const output = new Float32Array(totalLength);

  let position = 0;
  for (const note of notes) {
    const noteLength = Math.round(note.duration * sampleRate);
    if (note.midi !== null) {
      const soundingSeconds = Math.max(0, note.duration - gap);
      output.set(
        renderTone(midiToFrequency(note.midi), soundingSeconds, sampleRate, toneOptions),
        position
      );
    }
    position += noteLength;
  }
  return output;
}

/** A note placed at an exact time, as detected from a recording. */
export interface TimedNote {
  midi: number;
  /** Start time in seconds. */
  start: number;
  /** Length in seconds. */
  duration: number;
}

/** Makes the sound of one note: (frequency in Hz, length in seconds, sample rate) => samples. */
export type NoteVoice = (frequency: number, durationSeconds: number, sampleRate: number) => Float32Array;

/**
 * Render notes at their own start times (unlike renderMelody, which plays
 * notes back to back). Used to play a transcription back with its rhythm.
 * Times are taken as they are, so shift them first if the first note should
 * start right away. A short tail of silence is added at the end.
 *
 * `voice` makes each note's sound: a plain tone by default, or for example
 * renderReedNote (reed.ts) for a harmonica-like sound.
 */
export function renderNotes(
  notes: TimedNote[],
  sampleRate: number,
  voice: NoteVoice = (frequency, duration, rate) => renderTone(frequency, duration, rate)
): Float32Array {
  const end = notes.reduce((latest, n) => Math.max(latest, n.start + n.duration), 0);
  const output = new Float32Array(Math.round((end + 0.3) * sampleRate));

  for (const note of notes) {
    const tone = voice(midiToFrequency(note.midi), note.duration, sampleRate);
    const offset = Math.max(0, Math.round(note.start * sampleRate));
    // Add (not overwrite), in case two notes overlap slightly.
    for (let i = 0; i < tone.length && offset + i < output.length; i++) {
      output[offset + i] += tone[i];
    }
  }
  return output;
}
