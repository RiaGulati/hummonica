/**
 * Web version of share.ts. Browsers have no share sheet for files that works
 * everywhere, so the recording is downloaded as a WAV file instead.
 */

import { recordingUri, type SavedTranscription } from '@/storage/transcriptions';

/** Characters that are not allowed or awkward in file names. */
const UNSAFE_CHARACTERS = /[^a-zA-Z0-9 _-]+/g;

export async function shareRecording(saved: SavedTranscription): Promise<void> {
  const uri = recordingUri(saved);
  if (!uri) throw new Error('This transcription has no recording');

  const link = document.createElement('a');
  link.href = uri;
  link.download = `${saved.title.replace(UNSAFE_CHARACTERS, ' ').trim() || 'recording'}.wav`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
