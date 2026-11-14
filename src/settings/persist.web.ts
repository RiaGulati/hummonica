/** Web version of persist.ts: the settings are kept in the browser's localStorage. */

import { readText, writeText } from '@/storage/web-storage';

export function readSettingsText(): string | null {
  return readText('settings');
}

export function writeSettingsText(text: string): void {
  if (!writeText('settings', text)) throw new Error('The browser did not allow saving');
}
