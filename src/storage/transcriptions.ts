/**
 * Saves transcriptions on the phone with expo-file-system.
 *
 * Layout, inside the app's document folder (kept until the app is deleted):
 *   transcriptions/<id>.json   the notes and details (see format.ts)
 *   transcriptions/<id>.wav    the recording, 16-bit mono (optional)
 *
 * All calls are synchronous: the files are small (a 30 s recording is about
 * 3 MB), and it keeps the code simple.
 */

import { Directory, File, Paths } from 'expo-file-system';

import { encodeWav } from '@/dsp/wav';

import {
  createTranscription,
  parseTranscription,
  sortNewestFirst,
  type NewTranscription,
  type SavedTranscription,
} from './format';

export type { SavedTranscription } from './format';

function folder(): Directory {
  const directory = new Directory(Paths.document, 'transcriptions');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function jsonFile(id: string): File {
  return new File(folder(), `${id}.json`);
}

function wavFile(id: string): File {
  return new File(folder(), `${id}.wav`);
}

/** Save a new transcription, and its recording if one is given. */
export function saveTranscription(
  input: NewTranscription,
  recording: { samples: Float32Array; sampleRate: number } | null
): SavedTranscription {
  const saved = createTranscription(input, new Date(), recording !== null);
  if (recording) {
    const wav = wavFile(saved.id);
    wav.create({ overwrite: true });
    wav.write(encodeWav(recording.samples, recording.sampleRate));
  }
  const json = jsonFile(saved.id);
  json.create({ overwrite: true });
  json.write(JSON.stringify(saved));
  return saved;
}

/** Every saved transcription, newest first. Damaged files are skipped. */
export function listTranscriptions(): SavedTranscription[] {
  const items: SavedTranscription[] = [];
  for (const entry of folder().list()) {
    if (!(entry instanceof File) || !entry.name.endsWith('.json')) continue;
    try {
      const saved = parseTranscription(entry.textSync());
      if (saved) items.push(saved);
    } catch (error) {
      console.warn('Could not read', entry.name, error);
    }
  }
  return sortNewestFirst(items);
}

export function loadTranscription(id: string): SavedTranscription | null {
  const file = jsonFile(id);
  return file.exists ? parseTranscription(file.textSync()) : null;
}

export function deleteTranscription(id: string): void {
  for (const file of [jsonFile(id), wavFile(id)]) {
    if (file.exists) file.delete();
  }
}

/** file:// address of the saved recording, or null if there is none. */
export function recordingUri(saved: SavedTranscription): string | null {
  if (!saved.hasRecording) return null;
  const file = wavFile(saved.id);
  return file.exists ? file.uri : null;
}
