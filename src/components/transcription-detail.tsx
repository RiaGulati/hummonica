/**
 * History detail screen: one saved transcription with playback, sharing and
 * a Delete button.
 */

import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TranscriptionView } from '@/components/transcription-view';
import { BottomTabInset, Fonts, MaxContentWidth, Signal, Spacing } from '@/constants/theme';
import { deleteTranscription, loadTranscription } from '@/storage/transcriptions';

const DELETE = Signal.warning;

export function TranscriptionDetail({ id }: { id: string }) {
  // Read the file once, when the screen opens.
  const [saved] = useState(() => loadTranscription(id));

  function confirmDelete() {
    Alert.alert('Delete this transcription?', 'The tab and the recording will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTranscription(id);
          router.back();
        },
      },
    ]);
  }

  if (!saved) {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText themeColor="textSecondary">This transcription could not be found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: saved.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <TranscriptionView saved={saved} />
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.6 : 1 }]}>
          <ThemedText style={styles.deleteText}>Delete</ThemedText>
        </Pressable>
      </ScrollView>
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
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  deleteButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  deleteText: {
    color: DELETE,
    fontFamily: Fonts.monoMedium,
  },
});
