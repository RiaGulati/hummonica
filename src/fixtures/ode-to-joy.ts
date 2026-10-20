/**
 * Test fixture: the first phrase of Beethoven's "Ode to Joy", in C major,
 * placed in the middle register of a C harmonica (holes 4 to 6).
 *
 *   E E F G | G F E D | C C D E | E. D D-
 */

import type { MelodyNote } from '../dsp/synth';

/** Tempo of the fixture, in beats per minute. */
export const ODE_TO_JOY_BPM = 120;

const BEAT = 60 / ODE_TO_JOY_BPM;

/** [MIDI note, length in beats] */
const PHRASE: [number, number][] = [
  [76, 1], [76, 1], [77, 1], [79, 1], // E5 E5 F5 G5
  [79, 1], [77, 1], [76, 1], [74, 1], // G5 F5 E5 D5
  [72, 1], [72, 1], [74, 1], [76, 1], // C5 C5 D5 E5
  [76, 1.5], [74, 0.5], [74, 2],      // E5. D5 D5 (half note)
];

export const ODE_TO_JOY: MelodyNote[] = PHRASE.map(([midi, beats]) => ({
  midi,
  duration: beats * BEAT,
}));

/** Expected harmonica tab for the phrase above. */
export const ODE_TO_JOY_TAB = '5↑ 5↑ 5↓ 6↑ 6↑ 5↓ 5↑ 4↓ 4↑ 4↑ 4↓ 5↑ 5↑ 4↓ 4↓';
