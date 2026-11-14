/**
 * Web version of saved-tabs.ts: the same functions, stored in the browser's
 * localStorage instead of files (key saved-tabs/<id>).
 */

import { newId, sortNewestFirst } from './format';
import { createSavedTab, parseSavedTab, type NewSavedTab, type SavedTab } from './saved-tab-format';
import { listTexts, readText, removeText, writeText } from './web-storage';

export type { SavedTab, SavedTabSource } from './saved-tab-format';

const key = (id: string) => `saved-tabs/${id}`;

function write(saved: SavedTab): void {
  if (!writeText(key(saved.id), JSON.stringify(saved))) {
    throw new Error('The browser did not allow saving the tab');
  }
}

export function saveTab(input: NewSavedTab): SavedTab {
  const date = new Date();
  const saved = createSavedTab(input, newId(date), date);
  write(saved);
  return saved;
}

/** Every saved tab, newest first. Damaged entries are skipped. */
export function listSavedTabs(): SavedTab[] {
  const items = listTexts('saved-tabs')
    .map((text) => {
      try {
        return parseSavedTab(text);
      } catch {
        return null;
      }
    })
    .filter((saved): saved is SavedTab => saved !== null);
  return sortNewestFirst(items);
}

export function loadSavedTab(id: string): SavedTab | null {
  const text = readText(key(id));
  return text === null ? null : parseSavedTab(text);
}

export function renameSavedTab(saved: SavedTab, name: string): SavedTab {
  const renamed = { ...saved, name: name.trim() };
  write(renamed);
  return renamed;
}

export function deleteSavedTab(id: string): void {
  removeText(key(id));
}
