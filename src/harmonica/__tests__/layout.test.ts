/**
 * @jest-environment node
 */
import { nameToMidi } from '../../dsp/notes';
import { ALL_POSITIONS, C_HARMONICA, isPlayable, positionsFor } from '../layout';

describe('C harmonica layout', () => {
  it('matches the Richter tuning table', () => {
    expect(C_HARMONICA.map((h) => h.blow).join(' ')).toBe('C4 E4 G4 C5 E5 G5 C6 E6 G6 C7');
    expect(C_HARMONICA.map((h) => h.draw).join(' ')).toBe('D4 G4 B4 D5 F5 A5 B5 D6 F6 A6');
  });

  it('only bends the higher note of each hole, down to just above the lower note', () => {
    for (const hole of C_HARMONICA) {
      const blow = nameToMidi(hole.blow);
      const draw = nameToMidi(hole.draw);
      hole.drawBends.forEach((note, i) => {
        expect(draw).toBeGreaterThan(blow);
        expect(nameToMidi(note)).toBe(draw - (i + 1));
        expect(nameToMidi(note)).toBeGreaterThan(blow);
      });
      hole.blowBends.forEach((note, i) => {
        expect(blow).toBeGreaterThan(draw);
        expect(nameToMidi(note)).toBe(blow - (i + 1));
        expect(nameToMidi(note)).toBeGreaterThan(draw);
      });
    }
  });

  it('has 20 unbent and 12 bent positions', () => {
    expect(ALL_POSITIONS.filter((p) => p.bend === 0)).toHaveLength(20);
    expect(ALL_POSITIONS.filter((p) => p.bend > 0)).toHaveLength(12);
  });

  it('offers two ways to play G4 and none for F4 without bends', () => {
    expect(positionsFor(nameToMidi('G4'), false)).toHaveLength(2);
    expect(isPlayable(nameToMidi('F4'), false)).toBe(false);
    expect(positionsFor(nameToMidi('F4'), true)).toEqual([
      { hole: 2, breath: 'draw', bend: 2, midi: nameToMidi('F4') },
    ]);
  });

  it('cannot play F#5 even with bends', () => {
    expect(isPlayable(nameToMidi('F#5'), true)).toBe(false);
  });
});
