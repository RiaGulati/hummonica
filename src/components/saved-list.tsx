/**
 * The Saved screen: tabs the user saved and named, from recordings, the song
 * library or typed in. Reloaded each time the screen comes into view.
 */

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatPosition } from '@/harmonica';
import { listSavedTabs, type SavedTab, type SavedTabSource } from '@/storage/saved-tabs';

const PREVIEW_LENGTH = 10;

const SOURCE_LABELS: Record<SavedTabSource, string> = {
  recording: 'From a recording',
  library: 'From the song library',
  typed: 'Typed in',
};

function preview(saved: SavedTab): string {
  const symbols = saved.entries.slice(0, PREVIEW_LENGTH).map((entry) => formatPosition(entry.position));
  return symbols.join(' ') + (saved.entries.length > PREVIEW_LENGTH ? ' …' : '');
}

export function SavedList() {
  const [items, setItems] = useState<SavedTab[]>([]);

  useFocusEffect(
    useCallback(() => {
      try {
        setItems(listSavedTabs());
      } catch (error) {
        console.warn('Could not read the saved tabs', error);
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
        ListHeaderComponent={
          <View style={styles.header}>
            <ActionButton label="Add a tab" onPress={() => router.push('/saved/add')} />
          </View>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No saved tabs yet. Press &quot;Save tab&quot; on a recording or a song, or add a tab
            yourself.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/saved/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {SOURCE_LABELS[item.source]} · {item.entries.length} notes
              </ThemedText>
              <ThemedText numberOfLines={1}>{preview(item)}</ThemedText>
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
  header: {
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
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
