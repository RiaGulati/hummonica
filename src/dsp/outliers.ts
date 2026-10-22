/**
 * Removes isolated notes that are far from the melody around them.
 *
 * In Song mode the tracker sometimes picks a note from the bass, a chord or
 * another instrument for a moment. Such a note sits far from the melody both
 * before and after it. For every note we take the median pitch of the notes
 * before it and, separately, of the notes after it (up to `neighbours` on
 * each side). The note is dropped only if it is more than `maxSemitones` away
 * from BOTH.
 *
 * Checking the two sides separately protects real melodies:
 *   - when the melody moves to a new register and stays there, the notes at
 *     the change are close to one side, so they are kept;
 *   - a note at the start or end of the recording has only one side, which
 *     is then the only one checked.
 * A single note that jumps far away and straight back is still removed;
 * that is the trade-off of this rule.
 *
 * Tested on real recordings: improved all three (see references.ts).
 */

import { median, type DetectedNote } from './segment';

export interface OutlierOptions {
  /** Distance from the neighbours' median, in semitones, above which a note is dropped. */
  maxSemitones?: number;
  /** Notes compared on each side. */
  neighbours?: number;
}

export function removeOutlierNotes(
  notes: DetectedNote[],
  { maxSemitones = 7, neighbours = 4 }: OutlierOptions = {}
): DetectedNote[] {
  const pitches = notes.map((n) => n.midi);
  return notes.filter((note, i) => {
    const before = pitches.slice(Math.max(0, i - neighbours), i);
    const after = pitches.slice(i + 1, i + 1 + neighbours);
    const near = (side: number[]) => Math.abs(note.midi - median(side)) <= maxSemitones;
    // A side with no notes cannot vote. With no neighbours at all, keep the note.
    if (before.length === 0 && after.length === 0) return true;
    if (before.length === 0) return near(after);
    if (after.length === 0) return near(before);
    return near(before) || near(after);
  });
}
