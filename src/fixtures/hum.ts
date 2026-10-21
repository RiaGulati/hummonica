/**
 * Test fixture: simulates a person humming a melody, with the imperfections
 * of a real voice that a pure tone does not have:
 *   - a tuning offset (the singer's "A" is not exactly 440 Hz),
 *   - slow drift (going flat or sharp over the phrase),
 *   - vibrato (a regular wobble in pitch, about 5.5 times a second),
 *   - a short slide from one note to the next,
 *   - harmonics and a little background hiss.
 */

import { midiToFrequency } from '../dsp/notes';
import type { MelodyNote } from '../dsp/synth';

export interface HumOptions {
  /** Constant tuning offset in cents. */
  offsetCents?: number;
  /** Total drift over the whole melody in cents (negative = goes flat). */
  driftCents?: number;
  /** Vibrato depth in cents. */
  vibratoCents?: number;
  /** Semitones to move the melody, for example -12 for a lower voice. */
  transpose?: number;
}

const VIBRATO_RATE_HZ = 5.5;
const GLIDE_SECONDS = 0.04;
const GAP_SECONDS = 0.06;

export function renderHum(
  melody: MelodyNote[],
  sampleRate: number,
  { offsetCents = 0, driftCents = 0, vibratoCents = 0, transpose = 0 }: HumOptions = {}
): Float32Array {
  const totalSeconds = melody.reduce((sum, n) => sum + n.duration, 0);
  const output = new Float32Array(Math.round(totalSeconds * sampleRate));

  // Seeded random numbers so the hiss is the same on every run.
  let seed = 7;
  const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

  let phase = 0;
  let noteStart = 0;
  let previousMidi = (melody[0]?.midi ?? 60) + transpose;

  for (const note of melody) {
    const length = Math.round(note.duration * sampleRate);
    const startIndex = Math.round(noteStart * sampleRate);
    if (note.midi === null) {
      noteStart += note.duration;
      continue;
    }
    const midi = note.midi + transpose;
    const sounding = Math.round((note.duration - GAP_SECONDS) * sampleRate);

    for (let i = 0; i < length && startIndex + i < output.length; i++) {
      const t = noteStart + i / sampleRate;
      const glide = Math.min(1, i / (GLIDE_SECONDS * sampleRate));
      const pitch =
        previousMidi +
        (midi - previousMidi) * glide +
        (offsetCents + driftCents * (t / totalSeconds)) / 100 +
        (vibratoCents / 100) * Math.sin(2 * Math.PI * VIBRATO_RATE_HZ * t);

      // Advance the phase by the current frequency so pitch changes are smooth.
      phase += (2 * Math.PI * midiToFrequency(pitch)) / sampleRate;
      const envelope =
        i < sounding ? Math.min(1, i / (0.03 * sampleRate), (sounding - i) / (0.02 * sampleRate)) : 0;
      const voice =
        Math.sin(phase) + 0.6 * Math.sin(2 * phase) + 0.3 * Math.sin(3 * phase) + 0.15 * Math.sin(4 * phase);
      output[startIndex + i] = 0.25 * envelope * voice + 0.004 * (random() * 2 - 1);
    }
    noteStart += note.duration;
    previousMidi = midi;
  }
  return output;
}
