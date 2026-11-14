/**
 * Hands generated tab audio to the player, which plays addresses rather than
 * bytes. On the phone the WAV is written to the cache folder.
 */

import { File, Paths } from 'expo-file-system';

/** Each file gets a new name, so the player never reads a half-written file. */
let counter = 0;
let lastFile: File | null = null;

/** Store the WAV, replacing the previous one, and return its address. */
export function storePlaybackWav(wav: Uint8Array): string {
  if (lastFile?.exists) lastFile.delete();
  const file = new File(Paths.cache, `tab-playback-${++counter}.wav`);
  file.create({ overwrite: true });
  file.writeSync(wav);
  lastFile = file;
  return file.uri;
}
