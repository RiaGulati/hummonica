/**
 * Web version of transcriptions.ts: the same functions, stored in the browser.
 * The details go in localStorage (key transcriptions/<id>) and the recording,
 * if any, in IndexedDB (web-recordings.ts).
 */

import { encodeWav } from '@/dsp/wav';

import {
  createTranscription,
  parseTranscription,
  sortNewestFirst,
  type NewTranscription,
  type SavedTranscription,
} from './format';
import { deleteRecording, putRecording, recordingUrl } from './web-recordings';
import { listTexts, readText, removeText, writeText } from './web-storage';

export type { SavedTranscription } from './format';

const key = (id: string) => `transcriptions/${id}`;

/** Save a new transcription, and its recording if one is given. */
export function saveTranscription(
  input: NewTranscription,
  recording: { samples: Float32Array; sampleRate: number } | null
): SavedTranscription {
  const saved = createTranscription(input, new Date(), recording !== null);
  if (recording) putRecording(saved.id, encodeWav(recording.samples, recording.sampleRate));
  if (!writeText(key(saved.id), JSON.stringify(saved))) {
    throw new Error('The browser did not allow saving the transcription');
  }
  return saved;
}

/** Every saved transcription, newest first. Damaged entries are skipped. */
export function listTranscriptions(): SavedTranscription[] {
  const items = listTexts('transcriptions')
    .map((text) => {
      try {
        return parseTranscription(text);
      } catch {
        return null;
      }
    })
    .filter((saved): saved is SavedTranscription => saved !== null);
  return sortNewestFirst(items);
}

export function loadTranscription(id: string): SavedTranscription | null {
  const text = readText(key(id));
  return text === null ? null : parseTranscription(text);
}

export function deleteTranscription(id: string): void {
  removeText(key(id));
  deleteRecording(id);
}

/** blob: address of the saved recording, or null if there is none. */
export function recordingUri(saved: SavedTranscription): string | null {
  return saved.hasRecording ? recordingUrl(saved.id) : null;
}
