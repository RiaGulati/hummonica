/**
 * Builds harmonica tablature from detected notes and formats it as text.
 *
 * Notation:
 *   4↑     hole 4 blow
 *   4↓     hole 4 draw
 *   3↓''   hole 3 draw, bent down 2 semitones (one apostrophe per semitone)
 *   ✕      a note that cannot be played on this harmonica
 */

import type { DetectedNote } from '../dsp/segment';
import { chooseHoles } from './chooser';
import type { HarpPosition } from './layout';
import { bestTransposition, type TransposeMode } from './transpose';

export const UNPLAYABLE_MARK = '✕';

export interface TabSettings {
  allowBends: boolean;
  transpose: TransposeMode;
}

export const DEFAULT_TAB_SETTINGS: TabSettings = {
  allowBends: false,
  transpose: 'octave',
};

export interface TabEntry {
  /** The note as detected from the audio. */
  detectedMidi: number;
  /** The note after transposing. This is the one the tab plays. */
  midi: number;
  start: number;
  duration: number;
  /** How to play it, or null if it is unplayable. */
  position: HarpPosition | null;
}

export interface Tab {
  /** Semitones the melody was shifted by (0 if not transposed). */
  shift: number;
  entries: TabEntry[];
}

/** Turn detected notes into a tab: transpose, then choose holes. */
export function buildTab(notes: DetectedNote[], settings: TabSettings = DEFAULT_TAB_SETTINGS): Tab {
  const detected = notes.map((n) => n.midi);
  const { shift } = bestTransposition(detected, settings.transpose, settings.allowBends);
  const shifted = detected.map((midi) => midi + shift);
  const positions = chooseHoles(shifted, settings.allowBends);

  return {
    shift,
    entries: notes.map((note, i) => ({
      detectedMidi: note.midi,
      midi: shifted[i],
      start: note.start,
      duration: note.duration,
      position: positions[i],
    })),
  };
}

/** Text for a single tab symbol, for example "4↓" or "3↓''". */
export function formatPosition(position: HarpPosition | null): string {
  if (!position) return UNPLAYABLE_MARK;
  const arrow = position.breath === 'blow' ? '↑' : '↓';
  return `${position.hole}${arrow}${"'".repeat(position.bend)}`;
}

/** The whole tab as one line of text, separated by spaces. */
export function formatTab(tab: Tab): string {
  return tab.entries.map((entry) => formatPosition(entry.position)).join(' ');
}

/**
 * Index of the tab entry sounding at `time` (seconds, same clock as the note
 * start times), or -1 between notes. Used to highlight the note being played.
 */
export function entryIndexAt(tab: Tab, time: number): number {
  return tab.entries.findIndex((entry) => time >= entry.start && time < entry.start + entry.duration);
}
