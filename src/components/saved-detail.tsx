/** One saved tab: playback, Rename and Delete. */

import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { NameDialog } from '@/components/name-dialog';
import { TabPlayer } from '@/components/tab-player';
import { TabTextBlock } from '@/components/tab-text-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { savedTabToTab } from '@/storage/saved-tab-format';
import { deleteSavedTab, loadSavedTab, renameSavedTab } from '@/storage/saved-tabs';
import { loadTranscription, recordingUri } from '@/storage/transcriptions';

export function SavedDetail({ id }: { id: string }) {
  // Read the file once, when the screen opens.
  const [saved, setSaved] = useState(() => loadSavedTab(id));
  const [renaming, setRenaming] = useState(false);
  // A tab saved from a recording can still play the recording, if it is in History.
  const [recording] = useState(() => {
    const transcription = saved?.transcriptionId ? loadTranscription(saved.transcriptionId) : null;
    return transcription ? recordingUri(transcription) : null;
  });

  if (!saved) {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText themeColor="textSecondary">This tab could not be found.</ThemedText>
      </ThemedView>
    );
  }

  function rename(name: string) {
    setRenaming(false);
    try {
      setSaved(renameSavedTab(saved!, name));
    } catch (error) {
      console.warn('Could not rename the tab', error);
    }
  }

  function confirmDelete() {
    Alert.alert(`Delete "${saved!.name}"?`, 'The saved tab will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSavedTab(id);
          router.back();
        },
      },
    ]);
  }

  const tab = savedTabToTab(saved);
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: saved.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{saved.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {tab.entries.length} notes · saved {new Date(saved.createdAt).toLocaleDateString()}
            {tab.shift !== 0 && ` · moved ${tab.shift > 0 ? 'up' : 'down'} ${Math.abs(tab.shift)} semitones`}
          </ThemedText>
          <TabPlayer
            tab={tab}
            recordingUri={recording}
            actions={
              <>
                <ActionButton secondary label="Rename" onPress={() => setRenaming(true)} />
                <ActionButton secondary label="Delete" onPress={confirmDelete} />
              </>
            }
          />
        </ThemedView>
        {saved.sourceText && (
          <>
            <ThemedText type="smallBold">Tab as written</ThemedText>
            <TabTextBlock text={saved.sourceText} />
          </>
        )}
        {saved.sourceUrl && (
          <ActionButton
            secondary
            label="Open the original page"
            onPress={() => WebBrowser.openBrowserAsync(saved.sourceUrl!)}
          />
        )}
      </ScrollView>
      {renaming && (
        <NameDialog
          title="Rename tab"
          initialName={saved.name}
          confirmLabel="Rename"
          onCancel={() => setRenaming(false)}
          onConfirm={rename}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
