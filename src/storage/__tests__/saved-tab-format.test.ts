/**
 * @jest-environment node
 */
import { buildTab, formatTab, parseTabPositions } from '../../harmonica';
import { createSavedTab, parseSavedTab, savedTabToTab, tabFromPositions } from '../saved-tab-format';

const note = (midi: number, start: number) => ({ midi, cents: 0, frequency: 0, start, duration: 0.4 });
const DATE = new Date(2026, 9, 21, 18, 0);

describe('saved tab format', () => {
  const tab = buildTab([note(72, 0), note(74, 0.5), note(73, 1)]);

  it('survives a round trip through JSON, including unplayable notes', () => {
    const saved = createSavedTab({ name: '  My tune ', source: 'recording', tab, transcriptionId: 'abc' }, 'id1', DATE);
    expect(saved.name).toBe('My tune');
    const loaded = parseSavedTab(JSON.stringify(saved));
    expect(loaded).toEqual(saved);
    expect(formatTab(savedTabToTab(loaded!))).toBe(formatTab(tab));
  });

  it('rejects damaged files', () => {
    const saved = createSavedTab({ name: 'x', source: 'library', tab, songId: 'ode-to-joy' }, 'id2', DATE);
    expect(parseSavedTab('nope')).toBeNull();
    expect(parseSavedTab(JSON.stringify({ ...saved, source: 'radio' }))).toBeNull();
    expect(parseSavedTab(JSON.stringify({ ...saved, entries: [{ midi: 72 }] }))).toBeNull();
  });

  it('keeps the holes of a typed tab exactly as written', () => {
    // G4 can be 2 draw or 3 blow; the typed choice must be kept.
    const typed = tabFromPositions(parseTabPositions('-2 3 4'));
    expect(formatTab(typed)).toBe('2↓ 3↑ 4↑');
    expect(typed.entries[1].start).toBeGreaterThan(typed.entries[0].start);
  });
});
