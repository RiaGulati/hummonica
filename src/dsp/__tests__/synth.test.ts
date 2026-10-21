/**
 * @jest-environment node
 */
import { buildTab, entryIndexAt } from '../../harmonica/tab';
import { transcribe } from '../index';
import { renderNotes } from '../synth';

const SAMPLE_RATE = 22050;

describe('renderNotes', () => {
  const notes = [
    { midi: 72, start: 0.2, duration: 0.3 },
    { midi: 76, start: 0.8, duration: 0.4 },
  ];

  it('places each note at its own start time, with silence in between', () => {
    const audio = renderNotes(notes, SAMPLE_RATE);
    expect(audio.length).toBe(Math.round(1.5 * SAMPLE_RATE));
    const level = (from: number, to: number) =>
      Math.max(...audio.subarray(from * SAMPLE_RATE, to * SAMPLE_RATE).map(Math.abs));
    expect(level(0, 0.19)).toBe(0);
    expect(level(0.25, 0.45)).toBeGreaterThan(0.1);
    expect(level(0.55, 0.75)).toBe(0);
  });

  it('can be transcribed back into the same notes', () => {
    const audio = renderNotes(notes, SAMPLE_RATE, { harmonics: [1, 0.5] });
    expect(transcribe(audio, SAMPLE_RATE).map((n) => n.midi)).toEqual([72, 76]);
  });
});

describe('entryIndexAt', () => {
  const tab = buildTab([
    { midi: 72, cents: 0, frequency: 523, start: 1, duration: 0.5 },
    { midi: 76, cents: 0, frequency: 659, start: 2, duration: 0.5 },
  ]);

  it('finds the note sounding at a time, and -1 between notes', () => {
    expect(entryIndexAt(tab, 0.5)).toBe(-1);
    expect(entryIndexAt(tab, 1.2)).toBe(0);
    expect(entryIndexAt(tab, 1.7)).toBe(-1);
    expect(entryIndexAt(tab, 2.4)).toBe(1);
  });
});
