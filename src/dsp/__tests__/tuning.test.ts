/**
 * @jest-environment node
 */
import { buildTab, formatTab } from '../../harmonica';
import { renderHum, type HumOptions } from '../../fixtures/hum';
import { ODE_TO_JOY, ODE_TO_JOY_TAB } from '../../fixtures/ode-to-joy';
import { transcribe } from '../index';
import type { DetectedNote } from '../segment';
import { correctTuning } from '../tuning';

const SAMPLE_RATE = 44100;

function note(midi: number, cents: number): DetectedNote {
  return { midi, cents, frequency: 0, start: 0, duration: 0.5 };
}

describe('correctTuning', () => {
  it('leaves in-tune notes alone', () => {
    const notes = [note(64, 2), note(65, -3), note(67, 1)];
    expect(correctTuning(notes).map((n) => n.midi)).toEqual([64, 65, 67]);
  });

  it('fixes a melody sung almost half a semitone sharp', () => {
    // Intended E4 F4 G4 A4 G4, sung about 45 cents sharp. Wobble makes some
    // notes round up to the next semitone (reported as about -50 cents).
    const notes = [note(65, -49), note(65, 44), note(67, 41), note(70, -48), note(67, 46)];
    expect(correctTuning(notes).map((n) => n.midi)).toEqual([64, 65, 67, 69, 67]);
  });

  it('follows slow drift past half a semitone', () => {
    // Intended C4 D4 E4 F4 G4 A4 drifting from 0 to 80 cents flat.
    const notes = [note(60, 0), note(62, -15), note(64, -35), note(65, -48), note(66, 40), note(68, 22)];
    expect(correctTuning(notes).map((n) => n.midi)).toEqual([60, 62, 64, 65, 67, 69]);
  });

  it('ignores one badly sung note', () => {
    const notes = [note(60, 0), note(62, 3), note(64, 45), note(65, -2), note(67, 1)];
    const corrected = correctTuning(notes);
    expect(corrected.map((n) => n.midi)).toEqual([60, 62, 64, 65, 67]);
  });
});

describe('simulated humming of Ode to Joy', () => {
  const cases: [string, HumOptions][] = [
    ['in tune', { transpose: -12 }],
    ['with vibrato', { transpose: -12, vibratoCents: 30 }],
    ['40 cents flat', { transpose: -12, offsetCents: -40, vibratoCents: 20 }],
    ['45 cents sharp', { transpose: -12, offsetCents: 45, vibratoCents: 20 }],
    ['drifting 80 cents flat', { transpose: -12, driftCents: -80, vibratoCents: 20 }],
    ['drifting 70 cents sharp', { transpose: -12, driftCents: 70, vibratoCents: 20 }],
    ['low voice, 30 cents flat', { transpose: -24, offsetCents: -30, vibratoCents: 25 }],
  ];

  it.each(cases)('gives the right tab when hummed %s', (_name, options) => {
    const audio = renderHum(ODE_TO_JOY, SAMPLE_RATE, options);
    expect(formatTab(buildTab(transcribe(audio, SAMPLE_RATE)))).toBe(ODE_TO_JOY_TAB);
  });

  it('gets it wrong without tuning correction (why the correction exists)', () => {
    const audio = renderHum(ODE_TO_JOY, SAMPLE_RATE, { transpose: -12, offsetCents: 45, vibratoCents: 20 });
    const tab = formatTab(buildTab(transcribe(audio, SAMPLE_RATE, { correctTuning: false })));
    expect(tab).not.toBe(ODE_TO_JOY_TAB);
  });
});
