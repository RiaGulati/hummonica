/**
 * The format of a saved transcription, and how to read it back safely.
 * Pure TypeScript (no file access), so it can be tested in Node.
 *
 * We store the detected NOTES, not the tab. The tab is rebuilt from the notes
 * every time it is shown, so changing a setting (bends, transposing) or
 * improving the hole chooser also updates old transcriptions.
 *
 * Each transcription is one JSON file. The recording itself, when kept, is a
 * WAV file next to it with the same id.
 */

import type { DetectedNote, TranscribeMode } from '../dsp';

/** Increase when the format changes, so old files can be converted. */
export const FORMAT_VERSION = 1;

export interface SavedTranscription {
  version: number;
  /** Unique id, also used for the file names. */
  id: string;
  title: string;
  /** When it was recorded, as an ISO 8601 string. */
  createdAt: string;
  mode: TranscribeMode;
  /** Length of the recording in seconds. */
  duration: number;
  sampleRate: number;
  notes: DetectedNote[];
  /** True if the recording was saved as a WAV file next to the JSON file. */
  hasRecording: boolean;
}

export interface NewTranscription {
  notes: DetectedNote[];
  mode: TranscribeMode;
  duration: number;
  sampleRate: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A readable default title, for example "Song, 21 Oct 16:05". */
export function defaultTitle(mode: TranscribeMode, date: Date): string {
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  const kind = mode === 'song' ? 'Song' : 'Melody';
  return `${kind}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${time}`;
}

/**
 * An id that sorts by time and is safe in a file name: the time in base 36,
 * plus a few random characters in case two are saved in the same millisecond.
 */
export function newId(date: Date, random: () => number = Math.random): string {
  const suffix = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
  return `${date.getTime().toString(36)}-${suffix}`;
}

export function createTranscription(
  input: NewTranscription,
  date: Date,
  hasRecording: boolean
): SavedTranscription {
  return {
    version: FORMAT_VERSION,
    id: newId(date),
    title: defaultTitle(input.mode, date),
    createdAt: date.toISOString(),
    mode: input.mode,
    duration: input.duration,
    sampleRate: input.sampleRate,
    notes: input.notes,
    hasRecording,
  };
}

function isNote(value: unknown): value is DetectedNote {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Record<string, unknown>;
  return ['midi', 'cents', 'frequency', 'start', 'duration'].every(
    (key) => typeof note[key] === 'number'
  );
}

/**
 * Read a saved file. Returns null if it is damaged or not a transcription,
 * so one bad file does not break the whole History list.
 */
export function parseTranscription(json: string): SavedTranscription | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const t = data as Record<string, unknown>;
  const valid =
    t.version === FORMAT_VERSION &&
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.createdAt === 'string' &&
    (t.mode === 'voice' || t.mode === 'song') &&
    typeof t.duration === 'number' &&
    typeof t.sampleRate === 'number' &&
    typeof t.hasRecording === 'boolean' &&
    Array.isArray(t.notes) &&
    t.notes.every(isNote);
  return valid ? (t as unknown as SavedTranscription) : null;
}

/** Newest first. ISO dates sort correctly as plain text. */
export function sortNewestFirst(items: SavedTranscription[]): SavedTranscription[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
