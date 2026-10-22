/**
 * One recording from History: details, playback, Save tab and Share
 * recording, and the tab. Shown under the Listen buttons after a recording,
 * and on the History detail screen.
 */

import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { shareRecording } from '@/audio/share';
import { ActionButton } from '@/components/action-button';
import { NameDialog } from '@/components/name-dialog';
import { TabPlayer } from '@/components/tab-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { buildTab, unplayableHint } from '@/harmonica';
import { useTabSettings } from '@/settings/store';
import { saveTab } from '@/storage/saved-tabs';
import { recordingUri, type SavedTranscription } from '@/storage/transcriptions';

export function TranscriptionView({ saved }: { saved: SavedTranscription }) {
  // The tab is rebuilt from the saved notes, so it always uses the current settings.
  const settings = useTabSettings();
  const tab = buildTab(saved.notes, settings);
  const hint = unplayableHint(tab, settings);
  const recording = recordingUri(saved);
  const [message, setMessage] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);

  async function share() {
    setMessage(null);
    try {
      await shareRecording(saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not share the recording');
    }
  }

  function save(name: string) {
    setNaming(false);
    try {
      // The tab is saved as it looks now, with the current settings.
      saveTab({ name, source: 'recording', tab, transcriptionId: saved.id });
      setMessage(`Saved as "${name}" in Saved.`);
    } catch (error) {
      console.warn('Could not save the tab', error);
      setMessage('The tab could not be saved.');
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="smallBold">
        {saved.notes.length} notes in {saved.duration.toFixed(1)} s (
        {saved.mode === 'song' ? 'song' : 'hum / play'}, {saved.sampleRate} Hz)
      </ThemedText>
      {tab.shift !== 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Moved {tab.shift > 0 ? 'up' : 'down'} {Math.abs(tab.shift)} semitones to fit the
          harmonica.
        </ThemedText>
      )}
      {hint && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
      {message && (
        <ThemedText type="smallBold">
          {message}
        </ThemedText>
      )}

      <TabPlayer
        tab={tab}
        recordingUri={recording}
        actions={
          <>
            {tab.entries.length > 0 && <ActionButton label="Save tab" onPress={() => setNaming(true)} />}
            {recording && <ActionButton label="Share recording" onPress={share} />}
          </>
        }
      />

      {naming && (
        <NameDialog
          title="Name this tab"
          initialName={saved.title}
          onCancel={() => setNaming(false)}
          onConfirm={save}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
