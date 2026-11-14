/** Where the harmonica.com tab list is cached on the phone: the cache folder. */

import { File, Paths } from 'expo-file-system';

function indexFile(): File {
  return new File(Paths.cache, 'harmonica-com-index.json');
}

export function readIndexCacheText(): string | null {
  const file = indexFile();
  return file.exists ? file.textSync() : null;
}

export function writeIndexCacheText(text: string): void {
  const file = indexFile();
  file.create({ overwrite: true });
  file.writeSync(text);
}
