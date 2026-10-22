/**
 * The History list: every saved transcription, newest first. Tapping one opens
 * its detail screen. The list is reloaded each time the screen comes into
 * view, so a recording made on the Listen tab shows up straight away.
 */

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { buildTab, formatPosition, type TabSettings } from '@/harmonica';
import { useTabSettings } from '@/settings/store';
import { listTranscriptions, type SavedTranscription } from '@/storage/transcriptions';

/** Number of tab symbols shown as a preview in each row. */
const PREVIEW_LENGTH = 10;

function preview(saved: SavedTranscription, settings: TabSettings): string {
  const entries = buildTab(saved.notes, settings).entries;
  const symbols = entries.slice(0, PREVIEW_LENGTH).map((entry) => formatPosition(entry.position));
  return symbols.join(' ') + (entries.length > PREVIEW_LENGTH ? ' …' : '');
}

export function HistoryList() {
  const [items, setItems] = useState<SavedTranscription[]>([]);
  const settings = useTabSettings();

  useFocusEffect(
    useCallback(() => {
      try {
        setItems(listTranscriptions());
      } catch (error) {
        console.warn('Could not read the history', error);
      }
    }, [])
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Nothing here yet. Your recordings are saved here after you press Stop on the Listen
            tab.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.notes.length} notes · {item.duration.toFixed(1)} s ·{' '}
                {item.mode === 'song' ? 'song' : 'hum / play'}
              </ThemedText>
              {item.notes.length > 0 && <ThemedText numberOfLines={1}>{preview(item, settings)}</ThemedText>}
            </ThemedView>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  row: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
