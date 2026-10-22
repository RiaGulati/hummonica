/**
 * @jest-environment node
 */
import { removeOutlierNotes } from '../outliers';

const notes = (midis: number[]) =>
  midis.map((midi, i) => ({ midi, cents: 0, frequency: 0, start: i * 0.5, duration: 0.4 }));
const midis = (list: { midi: number }[]) => list.map((n) => n.midi);

describe('removeOutlierNotes', () => {
  it('drops a single stray bass note inside the melody', () => {
    expect(midis(removeOutlierNotes(notes([76, 77, 79, 55, 79, 77, 76])))).toEqual([76, 77, 79, 79, 77, 76]);
  });

  it('keeps steps and small leaps', () => {
    const tune = [72, 74, 76, 79, 76, 72, 67, 72];
    expect(midis(removeOutlierNotes(notes(tune)))).toEqual(tune);
  });

  it('keeps a jump when the melody stays in the new register', () => {
    const tune = [60, 62, 64, 62, 76, 77, 79, 77, 76, 74];
    expect(midis(removeOutlierNotes(notes(tune)))).toEqual(tune);
  });

  it('keeps a lone note, which has nothing to compare with', () => {
    expect(midis(removeOutlierNotes(notes([40])))).toEqual([40]);
  });
});
