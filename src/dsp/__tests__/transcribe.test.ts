/**
 * @jest-environment node
 */
import { ODE_TO_JOY } from '../../fixtures/ode-to-joy';
import { transcribe } from '../index';
import { medianFilter } from '../segment';
import { renderMelody } from '../synth';
import { PitchTracker } from '../tracker';

const SAMPLE_RATE = 44100;

describe('medianFilter', () => {
  it('removes a single-frame spike but keeps silence as silence', () => {
    const input = [60, 60, 72, 60, 60, NaN, NaN, 64, 64];
    const output = medianFilter(input, 5);
    expect(output[2]).toBe(60);
    expect(Number.isNaN(output[5])).toBe(true);
    expect(output[7]).toBe(64);
  });
});

describe('PitchTracker', () => {
  it('gives the same frames whether audio arrives at once or in small chunks', () => {
    const audio = renderMelody([{ midi: 69, duration: 0.5 }], SAMPLE_RATE);
    const whole = new PitchTracker(SAMPLE_RATE).push(audio);

    const chunked = new PitchTracker(SAMPLE_RATE);
    const pieces = [];
    for (let i = 0; i < audio.length; i += 1000) {
      pieces.push(...chunked.push(audio.subarray(i, i + 1000)));
    }
    expect(pieces.map((f) => f.time)).toEqual(whole.map((f) => f.time));
    expect(pieces.map((f) => f.frequency)).toEqual(whole.map((f) => f.frequency));
  });
});

describe('transcribe', () => {
  it('recovers the notes and timing of "Ode to Joy"', () => {
    const audio = renderMelody(ODE_TO_JOY, SAMPLE_RATE, { harmonics: [1, 0.5, 0.25] });
    const notes = transcribe(audio, SAMPLE_RATE);

    expect(notes.map((n) => n.midi)).toEqual(ODE_TO_JOY.map((n) => n.midi));

    // Start times should line up with the score within 30 ms.
    let expectedStart = 0;
    notes.forEach((note, i) => {
      expect(Math.abs(note.start - expectedStart)).toBeLessThan(0.03);
      expectedStart += ODE_TO_JOY[i].duration;
    });

    // Longer notes in the score should be detected as longer notes.
    const dottedE = notes[12].duration;
    const eighthD = notes[13].duration;
    const halfD = notes[14].duration;
    expect(eighthD).toBeLessThan(dottedE);
    expect(dottedE).toBeLessThan(halfD);
  });

  it('splits legato notes (no silence between them) on the pitch change', () => {
    const audio = renderMelody(
      [
        { midi: 64, duration: 0.3 },
        { midi: 67, duration: 0.3 },
        { midi: 72, duration: 0.3 },
      ],
      SAMPLE_RATE,
      { gap: 0, fadeMs: 0 }
    );
    expect(transcribe(audio, SAMPLE_RATE).map((n) => n.midi)).toEqual([64, 67, 72]);
  });

  it('ignores blips shorter than 60 ms', () => {
    const audio = renderMelody(
      [
        { midi: 64, duration: 0.4 },
        { midi: null, duration: 0.1 },
        { midi: 76, duration: 0.03 }, // a 30 ms blip
        { midi: null, duration: 0.1 },
        { midi: 67, duration: 0.4 },
      ],
      SAMPLE_RATE,
      { gap: 0 }
    );
    expect(transcribe(audio, SAMPLE_RATE).map((n) => n.midi)).toEqual([64, 67]);
  });

  it('finds nothing in silence', () => {
    expect(transcribe(new Float32Array(SAMPLE_RATE), SAMPLE_RATE)).toEqual([]);
  });
});
