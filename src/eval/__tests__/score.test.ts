/**
 * @jest-environment node
 */
import { REFERENCE_TABS } from '../../fixtures/references';
import { ODE_TO_JOY, ODE_TO_JOY_TAB } from '../../fixtures/ode-to-joy';
import { parseTab } from '../parse-tab';
import { scoreNotes, scoreNotesAnyKey } from '../score';

describe('parseTab', () => {
  it('reads website notation', () => {
    // C5 D5 E5, then 3 draw bent by 1 and 2 semitones, and 10 blow.
    expect(parseTab('4 -4 +5 -3\' -3" 10')).toEqual([72, 74, 76, 70, 69, 96]);
  });

  it('reads our own arrow notation', () => {
    expect(parseTab(ODE_TO_JOY_TAB)).toEqual(ODE_TO_JOY.map((n) => n.midi));
  });

  it('ignores brackets and repeat marks', () => {
    expect(parseTab('[-5 5] x2')).toEqual([77, 76]);
  });

  it('rejects symbols it cannot read', () => {
    expect(() => parseTab('45')).toThrow('Cannot read');
    expect(() => parseTab("-5'")).toThrow('not a note');
  });

  it('can read every reference tab', () => {
    for (const reference of REFERENCE_TABS) expect(parseTab(reference.tab).length).toBeGreaterThan(10);
  });
});

describe('scoreNotes', () => {
  const reference = [60, 62, 64, 65, 67];

  it('gives a perfect score for identical notes', () => {
    const score = scoreNotes(reference, reference);
    expect(score.correct).toBe(5);
    expect(score.accuracy).toBe(1);
    expect(score.cost).toBe(0);
  });

  it('counts each kind of mistake', () => {
    // 62 is missing, 76 is an octave error (64 + 12), 66 is wrong, 99 is extra.
    const score = scoreNotes([60, 76, 66, 67, 99], reference);
    expect(score).toMatchObject({ correct: 2, octave: 1, wrong: 1, missing: 1, extra: 1 });
  });

  it('in partial mode, does not count the unplayed end as missing', () => {
    const full = scoreNotes([60, 62], reference);
    const partial = scoreNotes([60, 62], reference, { partial: true });
    expect(full.missing).toBe(3);
    expect(partial.missing).toBe(0);
    expect(partial.accuracy).toBe(1);
  });

  it('finds the key shift of a recording in another key', () => {
    const score = scoreNotesAnyKey(reference.map((m) => m + 2), reference);
    expect(score.shift).toBe(-2);
    expect(score.accuracy).toBe(1);
  });
});
