/**
 * @jest-environment node
 */
import { ODE_TO_JOY_TAB } from '../../fixtures/ode-to-joy';
import { buildTab, formatTab, isPlayable } from '../../harmonica';
import { findSong, SONG_LIBRARY, songNotes } from '../library';
import { searchSongs, simplify } from '../search';

describe('song library', () => {
  it('has unique ids', () => {
    const ids = SONG_LIBRARY.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SONG_LIBRARY.map((song) => [song.title, song]))(
    '%s can be played on a C harmonica without bends',
    (_title, song) => {
      const notes = songNotes(song);
      expect(notes.length).toBeGreaterThan(10);
      const unplayable = notes.filter((n) => !isPlayable(n.midi, false));
      expect(unplayable).toEqual([]);
      // Notes follow each other in time.
      notes.slice(1).forEach((note, i) => expect(note.start).toBeGreaterThan(notes[i].start));
    }
  );

  it('gives the same Ode to Joy tab as the test fixture', () => {
    const notes = songNotes(findSong('ode-to-joy')!).slice(0, 15);
    expect(formatTab(buildTab(notes, { allowBends: false, transpose: 'none' }))).toBe(ODE_TO_JOY_TAB);
  });

  it('turns rests into time, not notes', () => {
    const notes = songNotes({ id: 't', title: 't', artist: 't', bpm: 60, melody: 'C5 R:2 D5' });
    expect(notes.map((n) => [n.midi, n.start])).toEqual([
      [72, 0],
      [74, 3],
    ]);
  });
});

describe('searchSongs', () => {
  const titles = (query: string) => searchSongs(query, SONG_LIBRARY).map((s) => s.title);

  it('ignores case, accents and punctuation', () => {
    expect(simplify('Frère  Jacques!')).toBe('frere jacques');
    expect(titles('FRERE')).toEqual(['Frère Jacques']);
  });

  it('matches the start of words in the title or artist', () => {
    expect(titles('jing bel')).toEqual(['Jingle Bells']);
    expect(titles('foster')).toEqual(['Camptown Races', 'Oh! Susanna']);
  });

  it('lists titles starting with the query first', () => {
    expect(titles('old')[0]).toBe('Old MacDonald Had a Farm');
  });

  it('lists every song, A to Z, for an empty search', () => {
    const all = titles('  ');
    expect(all.length).toBe(SONG_LIBRARY.length);
    expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b)));
  });

  it('finds nothing for an unknown song', () => {
    expect(titles('piano man')).toEqual([]);
  });
});
