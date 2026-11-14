/** Where the settings are kept on the phone: settings.json in the document folder. */

import { File, Paths } from 'expo-file-system';

function settingsFile(): File {
  return new File(Paths.document, 'settings.json');
}

export function readSettingsText(): string | null {
  const file = settingsFile();
  return file.exists ? file.textSync() : null;
}

export function writeSettingsText(text: string): void {
  const file = settingsFile();
  file.create({ overwrite: true });
  file.writeSync(text);
}
