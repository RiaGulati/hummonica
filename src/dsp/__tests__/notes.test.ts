/**
 * @jest-environment node
 */
import { frequencyToMidi, midiToFrequency, midiToName, nameToMidi, nearestNote } from '../notes';

describe('note conversions', () => {
  it('maps concert A and middle C to the right MIDI numbers', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 10);
    expect(frequencyToMidi(261.6256)).toBeCloseTo(60, 4);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });

  it('reports the cents offset from the nearest note', () => {
    // 445 Hz is about 19.6 cents sharp of A4.
    const note = nearestNote(445);
    expect(note.midi).toBe(69);
    expect(note.cents).toBeCloseTo(19.56, 1);

    // A quarter tone above A4 rounds to A#4 at -50 cents or A4 at +50 cents.
    expect(Math.abs(nearestNote(midiToFrequency(69.4)).cents - 40)).toBeLessThan(1e-6);
  });

  it('names notes in scientific pitch notation', () => {
    expect(midiToName(60)).toBe('C4');
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(96)).toBe('C7');
    expect(nameToMidi('C4')).toBe(60);
    expect(nameToMidi('Bb4')).toBe(70);
    expect(nameToMidi('F#5')).toBe(78);
    expect(() => nameToMidi('H2')).toThrow();
  });
});
