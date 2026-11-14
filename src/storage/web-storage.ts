/**
 * Browser storage for the web version of the app (used only by *.web.ts
 * files). On the phone, the same data lives in files; see the native modules.
 *
 * Text (settings, saved tabs, transcription details) goes in localStorage,
 * which is synchronous like the file calls it replaces. Every key starts with
 * PREFIX so the app's data can be listed without touching anything else on the
 * same site.
 *
 * Recordings are too big for localStorage (it holds about 5 MB in total), so
 * they go in IndexedDB instead; see web-recordings.ts.
 *
 * localStorage can be missing or throw (private windows, blocked site data),
 * so every call is guarded: reads return null and writes are skipped.
 */

const PREFIX = 'harmonica-app/';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readText(key: string): string | null {
  try {
    return storage()?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

/** Save a value. Returns false if the browser refused (full or blocked). */
export function writeText(key: string, value: string): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(PREFIX + key, value);
    return true;
  } catch (error) {
    console.warn('Could not save', key, error);
    return false;
  }
}

export function removeText(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    // Nothing to do: the value was not stored or cannot be reached.
  }
}

/** The values of every key that starts with `folder` + '/', for listing. */
export function listTexts(folder: string): string[] {
  const store = storage();
  if (!store) return [];
  const start = `${PREFIX}${folder}/`;
  const values: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (!key?.startsWith(start)) continue;
      const value = store.getItem(key);
      if (value !== null) values.push(value);
    }
  } catch (error) {
    console.warn('Could not list', folder, error);
  }
  return values;
}
