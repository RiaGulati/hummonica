/**
 * The app's settings, shared by every screen and saved on the phone.
 *
 * A tiny "store": the current value lives in this module, screens subscribe
 * with useTabSettings() (React's useSyncExternalStore), and updateSettings()
 * saves the change and tells every subscribed screen to re-render. So turning
 * on bends in Settings immediately changes the tabs in Listen and History.
 *
 * Saved as settings.json in the app's document folder, or in the browser's
 * storage on web (see persist.ts and persist.web.ts).
 */

import { useSyncExternalStore } from 'react';

import type { TabSettings } from '@/harmonica';

import { parseSettings } from './format';
import { readSettingsText, writeSettingsText } from './persist';

let current: TabSettings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): TabSettings {
  if (!current) {
    // First use: read the saved file (or fall back to the defaults).
    try {
      current = parseSettings(readSettingsText());
    } catch (error) {
      console.warn('Could not read the settings', error);
      current = parseSettings(null);
    }
  }
  return current;
}

export function updateSettings(change: Partial<TabSettings>): void {
  current = { ...getSettings(), ...change };
  try {
    writeSettingsText(JSON.stringify(current));
  } catch (error) {
    // The new setting still applies until the app is closed.
    console.warn('Could not save the settings', error);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current settings. The component re-renders when they change. */
export function useTabSettings(): TabSettings {
  return useSyncExternalStore(subscribe, getSettings);
}
