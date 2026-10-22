/**
 * A suggestion shown under a tab that has notes the harmonica cannot play
 * with the current settings.
 */

import type { Tab, TabSettings } from './tab';

export function unplayableHint(tab: Tab, settings: TabSettings): string | null {
  const count = tab.entries.filter((entry) => entry.position === null).length;
  if (count === 0) return null;

  const notes = count === 1 ? '1 note' : `${count} notes`;
  const tips: string[] = [];
  if (settings.transpose !== 'any') tips.push('"Any key" (moves the tune to a key that fits better)');
  if (!settings.allowBends) tips.push('"Bends" (adds notes that need bending)');
  if (tips.length === 0) return `${notes} cannot be played on a C harmonica, even with bends.`;
  return `${notes} cannot be played (✕). In Settings, try ${tips.join(' or ')}.`;
}
