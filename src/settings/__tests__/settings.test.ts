/**
 * @jest-environment node
 */
import { buildTab, DEFAULT_TAB_SETTINGS } from '../../harmonica';
import { unplayableHint } from '../../harmonica/hint';
import { parseSettings } from '../format';

const note = (midi: number, start: number) => ({ midi, cents: 0, frequency: 0, start, duration: 0.3 });

describe('parseSettings', () => {
  it('reads saved settings', () => {
    expect(parseSettings('{"allowBends":true,"transpose":"any"}')).toEqual({ allowBends: true, transpose: 'any' });
  });

  it('falls back to the defaults for missing, invalid or damaged settings', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_TAB_SETTINGS);
    expect(parseSettings('{oops')).toEqual(DEFAULT_TAB_SETTINGS);
    expect(parseSettings('{"allowBends":"yes","transpose":"sideways"}')).toEqual(DEFAULT_TAB_SETTINGS);
  });
});

describe('unplayableHint', () => {
  // C# and F# are not on a C harmonica without bends.
  const notes = [note(72, 0), note(73, 0.5), note(78, 1)];

  it('says nothing when every note can be played', () => {
    expect(unplayableHint(buildTab([note(72, 0)]), DEFAULT_TAB_SETTINGS)).toBeNull();
  });

  it('suggests Any key and bends when they are off', () => {
    const hint = unplayableHint(buildTab(notes), DEFAULT_TAB_SETTINGS);
    expect(hint).toContain('2 notes');
    expect(hint).toContain('Any key');
    expect(hint).toContain('Bends');
  });

  it('only suggests what is not already on', () => {
    // A tab with one unplayable note, built by hand so only the hint is tested.
    const tab = { shift: 0, entries: [{ detectedMidi: 75, midi: 75, start: 0, duration: 0.3, position: null }] };
    const hint = unplayableHint(tab, { allowBends: true, transpose: 'octave' });
    expect(hint).toContain('Any key');
    expect(hint).not.toContain('Bends');
  });
});
