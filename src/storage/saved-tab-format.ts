/**
 * The format of a saved tab, and how to read it back safely. Pure TypeScript.
 *
 * Unlike History (which keeps detected notes and rebuilds the tab with the
 * current settings), a saved tab keeps the finished tab: every note with its
 * hole, breath and bend. It stays exactly as it looked when it was saved,
 * which is what you expect from something you named and saved.
 */

import type { HarpPosition, Tab, TabEntry } from '../harmonica';

export const SAVED_TAB_VERSION = 1;

/** Where a saved tab came from. */
export type SavedTabSource = 'recording' | 'library' | 'typed' | 'online';

export interface SavedTab {
  version: number;
  id: string;
  name: string;
  /** ISO 8601 date. */
  createdAt: string;
  source: SavedTabSource;
  /** Semitones the tab was moved to fit the harmonica (recordings only). */
  shift: number;
  entries: TabEntry[];
  /** For a recording: its History entry, so the recording can be played. */
  transcriptionId: string | null;
  /** For a library song: its id. */
  songId: string | null;
  /** For a tab from a website: the tab text as written there (with lyrics). */
  sourceText: string | null;
  /** For a tab from a website: the page it came from. */
  sourceUrl: string | null;
}

export interface NewSavedTab {
  name: string;
  source: SavedTabSource;
  tab: Tab;
  transcriptionId?: string | null;
  songId?: string | null;
  sourceText?: string | null;
  sourceUrl?: string | null;
}

export function createSavedTab(input: NewSavedTab, id: string, date: Date): SavedTab {
  return {
    version: SAVED_TAB_VERSION,
    id,
    name: input.name.trim(),
    createdAt: date.toISOString(),
    source: input.source,
    shift: input.tab.shift,
    entries: input.tab.entries,
    transcriptionId: input.transcriptionId ?? null,
    songId: input.songId ?? null,
    sourceText: input.sourceText ?? null,
    sourceUrl: input.sourceUrl ?? null,
  };
}

/** The saved tab in the shape the tab view and playback use. */
export function savedTabToTab(saved: SavedTab): Tab {
  return { shift: saved.shift, entries: saved.entries };
}

const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

function isPosition(value: unknown): value is HarpPosition | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return isNumber(p.hole) && (p.breath === 'blow' || p.breath === 'draw') && isNumber(p.bend) && isNumber(p.midi);
}

function isEntry(value: unknown): value is TabEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    isNumber(e.detectedMidi) && isNumber(e.midi) && isNumber(e.start) && isNumber(e.duration) && isPosition(e.position)
  );
}

/** Read a saved tab file. Returns null if it is damaged, so one bad file does not break the list. */
export function parseSavedTab(json: string): SavedTab | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  // Fields added later may be missing from older files.
  const t: Record<string, unknown> = { sourceText: null, sourceUrl: null, ...data };
  const optionalText = (value: unknown) => value === null || typeof value === 'string';
  const valid =
    t.version === SAVED_TAB_VERSION &&
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.createdAt === 'string' &&
    ['recording', 'library', 'typed', 'online'].includes(t.source as string) &&
    isNumber(t.shift) &&
    Array.isArray(t.entries) &&
    t.entries.every(isEntry) &&
    optionalText(t.transcriptionId) &&
    optionalText(t.songId) &&
    optionalText(t.sourceText) &&
    optionalText(t.sourceUrl);
  return valid ? (t as unknown as SavedTab) : null;
}

/**
 * A tab typed or pasted by the user, using the holes exactly as written.
 * Typed tabs have no rhythm, so every note gets the same length.
 */
export function tabFromPositions(positions: HarpPosition[]): Tab {
  const NOTE_SECONDS = 0.5;
  return {
    shift: 0,
    entries: positions.map((position, i) => ({
      detectedMidi: position.midi,
      midi: position.midi,
      start: i * NOTE_SECONDS,
      duration: NOTE_SECONDS - 0.05,
      position,
    })),
  };
}
