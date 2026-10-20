/**
 * @jest-environment node
 */
import { renderMelody, transcribe } from '../../dsp';
import { ODE_TO_JOY } from '../../fixtures/ode-to-joy';
import { classifyLengths, findPauses } from '../rhythm';

/** Build back-to-back notes from a list of lengths in seconds. */
function sequence(durations: number[], gap = 0.03) {
  let start = 0;
  return durations.map((duration) => {
    const note = { start, duration };
    start += duration + gap;
    return note;
  });
}

describe('classifyLengths', () => {
  it('labels notes relative to the median length', () => {
    expect(classifyLengths(sequence([0.5, 0.5, 0.25, 0.5, 1.0]))).toEqual([
      'medium',
      'medium',
      'short',
      'medium',
      'long',
    ]);
  });

  it('handles an empty melody', () => {
    expect(classifyLengths([])).toEqual([]);
  });

  it('finds the eighth note and the half note in Ode to Joy', () => {
    const audio = renderMelody(ODE_TO_JOY, 44100, { harmonics: [1, 0.5, 0.25] });
    const lengths = classifyLengths(transcribe(audio, 44100));
    expect(lengths.slice(0, 12)).toEqual(Array(12).fill('medium'));
    // Dotted quarter, eighth, half.
    expect(lengths.slice(12)).toEqual(['medium', 'short', 'long']);
  });
});

describe('findPauses', () => {
  it('marks a long silence before a note', () => {
    const notes = [
      { start: 0, duration: 0.5 },
      { start: 0.55, duration: 0.5 },
      { start: 1.6, duration: 0.5 }, // half a second of silence before this one
    ];
    expect(findPauses(notes)).toEqual([false, false, true]);
  });
});
