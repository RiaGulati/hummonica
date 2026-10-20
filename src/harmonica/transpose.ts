/**
 * Auto-transpose: shifts the whole melody up or down so that as many notes as
 * possible land on playable holes.
 *
 * Every shift in a range is tried and scored. The best shift is the one that:
 *   1. makes the most notes playable, then
 *   2. changes the key the least (an octave shift keeps the same key, so it
 *      counts as no key change), then
 *   3. moves the fewest octaves.
 *
 * Two modes:
 *   - 'octave': only whole-octave shifts. The tune sounds the same, just higher
 *     or lower. Used by default, mainly for hummed melodies that sit below the
 *     harmonica's range.
 *   - 'any': any number of semitones, which can also change the key.
 */

import { isPlayable } from './layout';

export type TransposeMode = 'none' | 'octave' | 'any';

export interface Transposition {
  /** Semitones to add to every note. */
  shift: number;
  /** Number of notes that are playable after shifting. */
  playableCount: number;
}

/** Octave shifts to try: from 3 octaves down to 3 octaves up. */
const MAX_OCTAVES = 3;

function countPlayable(midiNotes: number[], shift: number, allowBends: boolean): number {
  return midiNotes.filter((midi) => isPlayable(midi + shift, allowBends)).length;
}

export function bestTransposition(
  midiNotes: number[],
  mode: TransposeMode,
  allowBends: boolean
): Transposition {
  // Key changes to try, smallest first: 0, then +-1, ..., then +6.
  const keyChanges = mode === 'any' ? [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, 6] : [0];
  // Octaves to try, nearest first: 0, -1, +1, -2, +2, ...
  const octaves = [0];
  if (mode !== 'none') {
    for (let n = 1; n <= MAX_OCTAVES; n++) octaves.push(-n, n);
  }

  let best: Transposition = { shift: 0, playableCount: countPlayable(midiNotes, 0, allowBends) };
  // Because the candidates are tried in order of preference (rules 2 and 3),
  // a later candidate only wins if it makes strictly more notes playable (rule 1).
  for (const keyChange of keyChanges) {
    for (const octave of octaves) {
      const shift = keyChange + 12 * octave;
      const playableCount = countPlayable(midiNotes, shift, allowBends);
      if (playableCount > best.playableCount) {
        best = { shift, playableCount };
      }
    }
  }
  return best;
}
