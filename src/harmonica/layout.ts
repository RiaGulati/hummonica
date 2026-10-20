/**
 * Note layout of a 10-hole diatonic harmonica in the key of C, Richter tuning.
 * This file is the single source of truth for which note each hole plays.
 *
 * Checked against:
 *   https://en.wikibooks.org/wiki/Harmonica/Harmonica_Layouts_and_Alternate_Tunings
 *   https://en.wikipedia.org/wiki/Richter-tuned_harmonica
 * Hole 1 blow is middle C (C4, 261.63 Hz).
 *
 * Bends: a skilled player can lower a note by changing the shape of the mouth.
 * On a Richter harmonica the higher of the two notes in a hole is the one that
 * bends, and it can be lowered until it is a semitone above the other note:
 *   - holes 1 to 6: the draw note is higher, so draw notes bend
 *   - holes 7 to 10: the blow note is higher, so blow notes bend
 *     (hole 7 bends only slightly, so it is usually left out of charts)
 * Hole 5 has only a quarter-tone gap (E5 to F5), so it has no usable bend.
 * Each bend list is ordered from the shallowest bend (1 semitone) downwards.
 */

import { nameToMidi } from '../dsp/notes';

export interface HoleLayout {
  hole: number;
  blow: string;
  draw: string;
  /** Notes reachable by bending the draw note, 1 semitone, 2 semitones, ... */
  drawBends: string[];
  /** Notes reachable by bending the blow note. */
  blowBends: string[];
}

export const C_HARMONICA: HoleLayout[] = [
  { hole: 1, blow: 'C4', draw: 'D4', drawBends: ['C#4'], blowBends: [] },
  { hole: 2, blow: 'E4', draw: 'G4', drawBends: ['F#4', 'F4'], blowBends: [] },
  { hole: 3, blow: 'G4', draw: 'B4', drawBends: ['A#4', 'A4', 'G#4'], blowBends: [] },
  { hole: 4, blow: 'C5', draw: 'D5', drawBends: ['C#5'], blowBends: [] },
  { hole: 5, blow: 'E5', draw: 'F5', drawBends: [], blowBends: [] },
  { hole: 6, blow: 'G5', draw: 'A5', drawBends: ['G#5'], blowBends: [] },
  { hole: 7, blow: 'C6', draw: 'B5', drawBends: [], blowBends: [] },
  { hole: 8, blow: 'E6', draw: 'D6', drawBends: [], blowBends: ['D#6'] },
  { hole: 9, blow: 'G6', draw: 'F6', drawBends: [], blowBends: ['F#6'] },
  { hole: 10, blow: 'C7', draw: 'A6', drawBends: [], blowBends: ['B6', 'A#6'] },
];

export type Breath = 'blow' | 'draw';

/** One way of producing a note on the harmonica. */
export interface HarpPosition {
  hole: number;
  breath: Breath;
  /** How many semitones the note is bent down. 0 means no bend. */
  bend: number;
  /** The note this position produces. */
  midi: number;
}

/** Every position the harmonica can play, built once from the table above. */
function buildPositions(layout: HoleLayout[]): HarpPosition[] {
  const positions: HarpPosition[] = [];
  for (const { hole, blow, draw, drawBends, blowBends } of layout) {
    positions.push({ hole, breath: 'blow', bend: 0, midi: nameToMidi(blow) });
    positions.push({ hole, breath: 'draw', bend: 0, midi: nameToMidi(draw) });
    drawBends.forEach((note, i) =>
      positions.push({ hole, breath: 'draw', bend: i + 1, midi: nameToMidi(note) })
    );
    blowBends.forEach((note, i) =>
      positions.push({ hole, breath: 'blow', bend: i + 1, midi: nameToMidi(note) })
    );
  }
  return positions;
}

export const ALL_POSITIONS: HarpPosition[] = buildPositions(C_HARMONICA);

/** All the ways to play a MIDI note. Empty when the note is unplayable. */
export function positionsFor(midi: number, allowBends: boolean): HarpPosition[] {
  return ALL_POSITIONS.filter((p) => p.midi === midi && (allowBends || p.bend === 0));
}

/** True if the note can be played (with the given bend setting). */
export function isPlayable(midi: number, allowBends: boolean): boolean {
  return positionsFor(midi, allowBends).length > 0;
}
