/**
 * Conversions between frequency (Hz), MIDI note numbers and note names.
 *
 * MIDI note numbers give every semitone an integer: middle C (C4) is 60 and
 * concert A (A4, 440 Hz) is 69. Each octave doubles the frequency and spans 12
 * semitones, so the relationship is logarithmic:
 *
 *   midi = 69 + 12 * log2(frequency / 440)
 *
 * A fractional result means the pitch sits between two notes. The fractional
 * part times 100 is the offset in "cents" (1 semitone = 100 cents).
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const A4_MIDI = 69;
const A4_FREQUENCY = 440;

/** Exact (fractional) MIDI value for a frequency. 440 Hz gives exactly 69. */
export function frequencyToMidi(frequency: number): number {
  return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
}

/** Frequency in Hz for a (possibly fractional) MIDI value. */
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

export interface NearestNote {
  /** Nearest whole MIDI note. */
  midi: number;
  /** How far the input is from that note, from -50 to +50 cents. */
  cents: number;
}

/** Snap a frequency to the nearest note and report how far off it was. */
export function nearestNote(frequency: number): NearestNote {
  const exact = frequencyToMidi(frequency);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}

/** Name of a MIDI note in scientific pitch notation, for example 60 gives "C4". */
export function midiToName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

/** Parse a name like "C4", "F#5" or "Bb3" into a MIDI note number. */
export function nameToMidi(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(name.trim());
  if (!match) {
    throw new Error(`Not a note name: "${name}"`);
  }
  const [, letter, accidental, octaveText] = match;
  let pitchClass: number = NOTE_NAMES.indexOf(letter as (typeof NOTE_NAMES)[number]);
  if (accidental === '#') pitchClass += 1;
  if (accidental === 'b') pitchClass -= 1;
  return (Number(octaveText) + 1) * 12 + pitchClass;
}
