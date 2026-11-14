/** Web version of playback-file.ts: the WAV is kept in memory as a blob: URL. */

let lastUrl: string | null = null;

/** Store the WAV, replacing the previous one, and return its address. */
export function storePlaybackWav(wav: Uint8Array): string {
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(new Blob([wav as BlobPart], { type: 'audio/wav' }));
  return lastUrl;
}
