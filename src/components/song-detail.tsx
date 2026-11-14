/** A song from the library: its tab, playback and a Save button. */

import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { NameDialog } from '@/components/name-dialog';
import { TabPlayer } from '@/components/tab-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { buildTab } from '@/harmonica';
import { useTabSettings } from '@/settings/store';
import { findSong, songNotes } from '@/songs/library';
import { saveTab } from '@/storage/saved-tabs';

export function SongDetail({ id }: { id: string }) {
  const song = findSong(id);
  const settings = useTabSettings();
  const [naming, setNaming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!song) {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText themeColor="textSecondary">This song could not be found.</ThemedText>
      </ThemedView>
    );
  }

  // Library songs are already written for a C harmonica, so they are never transposed.
  const tab = buildTab(songNotes(song), { allowBends: settings.allowBends, transpose: 'none' });

  function save(name: string) {
    setNaming(false);
    try {
      saveTab({ name, source: 'library', tab, songId: song!.id });
      setMessage(`Saved as "${name}" in Saved.`);
    } catch (error) {
      console.warn('Could not save the tab', error);
      setMessage('The tab could not be saved.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: song.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{song.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {song.artist} · {tab.entries.length} notes · C harmonica
          </ThemedText>
          {message && <ThemedText type="smallBold">{message}</ThemedText>}
          <TabPlayer tab={tab} actions={<ActionButton secondary label="Save tab" onPress={() => setNaming(true)} />} />
        </ThemedView>
      </ScrollView>
      {naming && (
        <NameDialog
          title="Name this tab"
          initialName={song.title}
          onCancel={() => setNaming(false)}
          onConfirm={save}
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
