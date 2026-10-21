/**
 * @jest-environment node
 */
import {
  createTranscription,
  defaultTitle,
  newId,
  parseTranscription,
  sortNewestFirst,
} from '../format';

const NOTE = { midi: 72, cents: 3, frequency: 524, start: 0.5, duration: 0.4 };
const DATE = new Date(2026, 9, 21, 16, 5);

describe('saved transcription format', () => {
  it('makes readable default titles', () => {
    expect(defaultTitle('song', DATE)).toBe('Song, 21 Oct 16:05');
    expect(defaultTitle('voice', DATE)).toBe('Melody, 21 Oct 16:05');
  });

  it('makes ids that are safe in file names and differ within the same millisecond', () => {
    const a = newId(DATE, () => 0.1);
    const b = newId(DATE, () => 0.2);
    expect(a).toMatch(/^[0-9a-z]+-[0-9a-z]{4}$/);
    expect(a).not.toBe(b);
  });

  it('survives a round trip through JSON', () => {
    const saved = createTranscription({ notes: [NOTE], mode: 'song', duration: 3, sampleRate: 48000 }, DATE, true);
    expect(parseTranscription(JSON.stringify(saved))).toEqual(saved);
  });

  it('rejects damaged or unknown files instead of crashing', () => {
    const saved = createTranscription({ notes: [NOTE], mode: 'voice', duration: 3, sampleRate: 48000 }, DATE, false);
    expect(parseTranscription('{not json')).toBeNull();
    expect(parseTranscription('null')).toBeNull();
    expect(parseTranscription(JSON.stringify({ ...saved, version: 99 }))).toBeNull();
    expect(parseTranscription(JSON.stringify({ ...saved, mode: 'whistle' }))).toBeNull();
    expect(parseTranscription(JSON.stringify({ ...saved, notes: [{ midi: 'C5' }] }))).toBeNull();
  });

  it('sorts newest first', () => {
    const older = createTranscription({ notes: [], mode: 'voice', duration: 1, sampleRate: 44100 }, DATE, false);
    const newer = createTranscription({ notes: [], mode: 'voice', duration: 1, sampleRate: 44100 }, new Date(2026, 9, 22), false);
    expect(sortNewestFirst([older, newer]).map((t) => t.id)).toEqual([newer.id, older.id]);
  });
});
