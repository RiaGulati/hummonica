/**
 * Share a saved recording as a WAV file through the system share sheet
 * (AirDrop, Messages, Mail, Files, ...). Used to send real recordings to the
 * computer for testing the detection.
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { recordingUri, type SavedTranscription } from '@/storage/transcriptions';

/** Characters that are not allowed or awkward in file names. */
const UNSAFE_CHARACTERS = /[^a-zA-Z0-9 _-]+/g;

export async function shareRecording(saved: SavedTranscription): Promise<void> {
  const uri = recordingUri(saved);
  if (!uri) throw new Error('This transcription has no recording');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');

  // Share a copy named after the title, so the receiver sees
  // "Song 21 Oct 16 05.wav" instead of the internal id.
  const folder = new Directory(Paths.cache, 'share');
  folder.create({ idempotent: true, intermediates: true });
  const name = saved.title.replace(UNSAFE_CHARACTERS, ' ').trim() || 'recording';
  const copy = new File(folder, `${name}.wav`);
  copy.create({ overwrite: true });
  copy.writeSync(new File(uri).bytesSync());

  await Sharing.shareAsync(copy.uri, {
    mimeType: 'audio/wav',
    UTI: 'com.microsoft.waveform-audio',
    dialogTitle: 'Share recording',
  });
}
