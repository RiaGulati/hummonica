/**
 * Saves named tabs on the phone with expo-file-system: one JSON file per tab
 * in the app's document folder (saved-tabs/<id>.json). See saved-tab-format.ts.
 */

import { Directory, File, Paths } from 'expo-file-system';

import { newId, sortNewestFirst } from './format';
import { createSavedTab, parseSavedTab, type NewSavedTab, type SavedTab } from './saved-tab-format';

export type { SavedTab, SavedTabSource } from './saved-tab-format';

function folder(): Directory {
  const directory = new Directory(Paths.document, 'saved-tabs');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function tabFile(id: string): File {
  return new File(folder(), `${id}.json`);
}

function write(saved: SavedTab): void {
  const file = tabFile(saved.id);
  file.create({ overwrite: true });
  file.write(JSON.stringify(saved));
}

export function saveTab(input: NewSavedTab): SavedTab {
  const date = new Date();
  const saved = createSavedTab(input, newId(date), date);
  write(saved);
  return saved;
}

/** Every saved tab, newest first. Damaged files are skipped. */
export function listSavedTabs(): SavedTab[] {
  const items: SavedTab[] = [];
  for (const entry of folder().list()) {
    if (!(entry instanceof File) || !entry.name.endsWith('.json')) continue;
    try {
      const saved = parseSavedTab(entry.textSync());
      if (saved) items.push(saved);
    } catch (error) {
      console.warn('Could not read', entry.name, error);
    }
  }
  return sortNewestFirst(items);
}

export function loadSavedTab(id: string): SavedTab | null {
  const file = tabFile(id);
  return file.exists ? parseSavedTab(file.textSync()) : null;
}

export function renameSavedTab(saved: SavedTab, name: string): SavedTab {
  const renamed = { ...saved, name: name.trim() };
  write(renamed);
  return renamed;
}

export function deleteSavedTab(id: string): void {
  const file = tabFile(id);
  if (file.exists) file.delete();
}
