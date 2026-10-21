/**
 * Tuning correction for singing and humming.
 *
 * The note grid assumes A4 = 440 Hz, but people rarely hum at exactly that
 * tuning. Someone who hums 45 cents sharp sits almost halfway between two
 * notes, so small wobbles make the rounding flip up and down, producing sharps
 * and flats that were never meant. Voices also drift slowly flat or sharp
 * during a phrase.
 *
 * The fix: estimate the singer's own tuning offset around each note and remove
 * it before rounding.
 *   1. For each note, take its deviation from the nearest semitone
 *      (between -0.5 and +0.5 semitones).
 *   2. "Unwrap" these deviations so they change smoothly. If the singer drifts
 *      from -0.45 to -0.55, rounding reports the second value as +0.45 on the
 *      next semitone. Unwrapping adds or removes whole semitones so each value
 *      stays close to the ones before it, giving -0.55.
 *   3. Centre the overall offset within half a semitone, so the melody as a
 *      whole is not moved to a different note.
 *   4. Smooth with a median over neighbouring notes. This follows slow drift
 *      but ignores a single badly sung note.
 *   5. Subtract the local offset from each note and round again.
 *
 * Real melody steps are whole semitones, so they do not change the offset.
 * Only the leftover fraction does. In-tune input (a real harmonica, a piano)
 * has offsets near zero and passes through unchanged.
 */

import { median, type DetectedNote } from './segment';

/** Notes on each side used when smoothing the offset. */
const SMOOTHING_RADIUS = 2;
/** Recent notes used as the reference when unwrapping. */
const UNWRAP_HISTORY = 3;

export function correctTuning(notes: DetectedNote[]): DetectedNote[] {
  if (notes.length === 0) return notes;

  // Steps 1 and 2: deviations from the nearest semitone, unwrapped.
  const offsets: number[] = [];
  for (const note of notes) {
    const deviation = note.cents / 100;
    if (offsets.length === 0) {
      offsets.push(deviation);
      continue;
    }
    const reference = median(offsets.slice(-UNWRAP_HISTORY));
    // Shift by whole semitones to get as close to the reference as possible.
    offsets.push(deviation + Math.round(reference - deviation));
  }

  // Step 3: keep the overall offset within half a semitone.
  const centre = Math.round(median(offsets));

  // Steps 4 and 5: smooth, subtract, round again.
  return notes.map((note, i) => {
    const neighbours = offsets.slice(
      Math.max(0, i - SMOOTHING_RADIUS),
      i + SMOOTHING_RADIUS + 1
    );
    const localOffset = median(neighbours) - centre;
    const corrected = note.midi + note.cents / 100 - localOffset;
    const midi = Math.round(corrected);
    return { ...note, midi, cents: (corrected - midi) * 100 };
  });
}
