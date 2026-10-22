/**
 * Reading saved settings safely. Pure TypeScript, so it can be tested in Node.
 * Anything missing or invalid falls back to the default, so an old or damaged
 * settings file never breaks the app.
 */

import { DEFAULT_TAB_SETTINGS, type TabSettings, type TransposeMode } from '../harmonica';

const TRANSPOSE_MODES: TransposeMode[] = ['none', 'octave', 'any'];

export function parseSettings(json: string | null): TabSettings {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = json ? JSON.parse(json) : {};
    if (typeof parsed === 'object' && parsed !== null) data = parsed as Record<string, unknown>;
  } catch {
    // Damaged file: use the defaults.
  }
  return {
    allowBends:
      typeof data.allowBends === 'boolean' ? data.allowBends : DEFAULT_TAB_SETTINGS.allowBends,
    transpose: TRANSPOSE_MODES.includes(data.transpose as TransposeMode)
      ? (data.transpose as TransposeMode)
      : DEFAULT_TAB_SETTINGS.transpose,
  };
}
