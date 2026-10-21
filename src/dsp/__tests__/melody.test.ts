/**
 * @jest-environment node
 */
import { ODE_TO_JOY, ODE_TO_JOY_TAB } from '../../fixtures/ode-to-joy';
import { renderSong } from '../../fixtures/song';
import { buildTab, formatTab } from '../../harmonica/tab';
import { transcribe } from '../index';
import { MelodyTracker } from '../melody';
import { renderMelody } from '../synth';

const SAMPLE_RATE = 44100;

// The song is rendered once and shared, because rendering takes a moment.
const song = renderSong(SAMPLE_RATE);

describe('song mode', () => {
  it('recovers the Ode to Joy tab from a mix with chords, bass and drums', () => {
    const notes = transcribe(song, SAMPLE_RATE, { mode: 'song' });
    expect(notes.map((n) => n.midi)).toEqual(ODE_TO_JOY.map((n) => n.midi));
    expect(formatTab(buildTab(notes))).toBe(ODE_TO_JOY_TAB);
  });

  it('keeps the note timing, including the repeated notes', () => {
    const notes = transcribe(song, SAMPLE_RATE, { mode: 'song' });
    let expectedStart = 0;
    notes.forEach((note, i) => {
      // The 4096-sample FFT frame is longer than YIN's, so timing is a bit looser.
      expect(Math.abs(note.start - expectedStart)).toBeLessThan(0.06);
      expectedStart += ODE_TO_JOY[i].duration;
    });
  });

  it('still works when the melody is only half as loud', () => {
    const quieter = renderSong(SAMPLE_RATE, { melodyLevel: 0.5 });
    expect(formatTab(buildTab(transcribe(quieter, SAMPLE_RATE, { mode: 'song' })))).toBe(ODE_TO_JOY_TAB);
  });

  it('also works on a single melody with no accompaniment', () => {
    const audio = renderMelody(ODE_TO_JOY, SAMPLE_RATE, { harmonics: [1, 0.5, 0.25] });
    expect(formatTab(buildTab(transcribe(audio, SAMPLE_RATE, { mode: 'song' })))).toBe(ODE_TO_JOY_TAB);
  });

  it('gives the same result whether audio arrives at once or in chunks', () => {
    const whole = new MelodyTracker(SAMPLE_RATE);
    whole.push(song);
    const chunked = new MelodyTracker(SAMPLE_RATE);
    for (let i = 0; i < song.length; i += 4410) chunked.push(song.subarray(i, i + 4410));
    expect(chunked.finish().map((f) => f.midi)).toEqual(whole.finish().map((f) => f.midi));
  });

  it('finds nothing in silence', () => {
    expect(transcribe(new Float32Array(SAMPLE_RATE), SAMPLE_RATE, { mode: 'song' })).toEqual([]);
  });
});

describe('voice mode on a song', () => {
  // This documents WHY song mode exists: YIN expects one note at a time, so
  // in a full mix it locks onto the bass and drums as often as the melody.
  it('does not recover the tab', () => {
    const notes = transcribe(song, SAMPLE_RATE);
    expect(formatTab(buildTab(notes))).not.toBe(ODE_TO_JOY_TAB);
    // Many detected notes are far below the melody (which starts at C5 = 72).
    const belowMelody = notes.filter((n) => n.midi < 60).length;
    expect(belowMelody).toBeGreaterThan(notes.length / 3);
  });
});
