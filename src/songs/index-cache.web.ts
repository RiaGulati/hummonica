/** Web version of index-cache.ts: the tab list is cached in the browser's localStorage. */

import { readText, writeText } from '@/storage/web-storage';

export function readIndexCacheText(): string | null {
  return readText('harmonica-com-index');
}

export function writeIndexCacheText(text: string): void {
  if (!writeText('harmonica-com-index', text)) throw new Error('The browser did not allow saving');
}
