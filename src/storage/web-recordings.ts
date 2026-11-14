/**
 * Recordings for the web version of the app, kept in IndexedDB as WAV blobs
 * (used only by transcriptions.web.ts).
 *
 * The rest of the app asks for a recording's address synchronously
 * (recordingUri), but IndexedDB is asynchronous. So every stored recording is
 * loaded once when this module is first imported and turned into a blob: URL,
 * kept in `urls`. New recordings are added to `urls` straight away and saved
 * in the background.
 *
 * If IndexedDB is unavailable, recordings still play until the page is
 * reloaded; they are just not kept.
 */

const DB_NAME = 'harmonica-app';
const STORE = 'recordings';

const urls = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let db: Promise<IDBDatabase> | null = null;
function database(): Promise<IDBDatabase> {
  db ??= openDb();
  return db;
}

/** Run one request in a transaction and wait for the transaction to finish. */
async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const transaction = (await database()).transaction(STORE, mode);
  const request = action(transaction.objectStore(STORE));
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** Load every stored recording into `urls`. Started when the module loads. */
async function preload(): Promise<void> {
  try {
    const store = (await database()).transaction(STORE, 'readonly').objectStore(STORE);
    await new Promise<void>((resolve, reject) => {
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return resolve();
        const id = String(entry.key);
        if (entry.value instanceof Blob && !urls.has(id)) {
          urls.set(id, URL.createObjectURL(entry.value));
        }
        entry.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });
  } catch (error) {
    console.warn('Saved recordings are not available in this browser', error);
  }
}

if (typeof window !== 'undefined') void preload();

export function putRecording(id: string, wav: Uint8Array): void {
  const blob = new Blob([wav as BlobPart], { type: 'audio/wav' });
  urls.set(id, URL.createObjectURL(blob));
  run('readwrite', (store) => store.put(blob, id)).catch((error) =>
    console.warn('Could not keep the recording after a reload', error)
  );
}

export function recordingUrl(id: string): string | null {
  return urls.get(id) ?? null;
}

export function deleteRecording(id: string): void {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
  run('readwrite', (store) => store.delete(id)).catch((error) =>
    console.warn('Could not delete the recording', error)
  );
}
