/**
 * Rough rhythm for the tab display.
 *
 * Without a metronome we do not know the tempo, so we use the melody itself as
 * the reference: the median note length is taken as a "normal" note. Each note
 * is then labelled short, medium or long compared with it. A median is used
 * (not an average) so a few very long held notes do not shift the reference.
 *
 * We also mark pauses: a silence between two notes that is long compared with
 * a normal note usually means the end of a phrase.
 */

import { median } from '../dsp/segment';

export type NoteLength = 'short' | 'medium' | 'long';

/** Notes shorter than this fraction of the median are "short". */
const SHORT_BELOW = 0.7;
/** Notes longer than this multiple of the median are "long". */
const LONG_ABOVE = 1.6;
/** A silence longer than this multiple of the median counts as a pause. */
const PAUSE_ABOVE = 0.75;

interface Timed {
  start: number;
  duration: number;
}

export function classifyLengths(notes: Timed[]): NoteLength[] {
  if (notes.length === 0) return [];
  const reference = median(notes.map((n) => n.duration));
  return notes.map(({ duration }) => {
    if (duration < reference * SHORT_BELOW) return 'short';
    if (duration > reference * LONG_ABOVE) return 'long';
    return 'medium';
  });
}

/** pauses[i] is true when there is a noticeable silence just before note i. */
export function findPauses(notes: Timed[]): boolean[] {
  if (notes.length === 0) return [];
  const reference = median(notes.map((n) => n.duration));
  return notes.map((note, i) => {
    if (i === 0) return false;
    const previous = notes[i - 1];
    const silence = note.start - (previous.start + previous.duration);
    return silence > reference * PAUSE_ABOVE;
  });
}
