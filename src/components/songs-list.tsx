/**
 * The Songs screen: search by title or artist in two places at once:
 *   - harmonica.com: the site's tabs, downloaded on the phone (see
 *     songs/harmonica-com.ts); needs an internet connection the first time,
 *   - the built-in library of public domain songs, which works offline.
 * The user can also type in a tab themselves.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { OnlineTabSummary } from '@/songs/harmonica-com';
import { SONG_LIBRARY, type LibrarySong } from '@/songs/library';
import { searchSongs } from '@/songs/search';
import { useOnlineTabIndex, type LoadStatus } from '@/songs/use-online-tabs';

type Row = { kind: 'online'; song: OnlineTabSummary } | { kind: 'library'; song: LibrarySong };

interface Section {
  key: 'online' | 'library';
  title: string;
  data: Row[];
}

function openRow(row: Row) {
  if (row.kind === 'online') {
    router.push({
      pathname: '/songs/online/[id]',
      params: { id: String(row.song.id), title: row.song.title },
    });
  } else {
    router.push({ pathname: '/songs/[id]', params: { id: row.song.id } });
  }
}

function OnlineStatus({ status, empty, onRetry }: { status: LoadStatus; empty: boolean; onRetry: () => void }) {
  if (status === 'loading') {
    return (
      <View style={styles.status}>
        <ActivityIndicator />
        <ThemedText type="small" themeColor="textSecondary">
          Loading tabs from harmonica.com…
        </ThemedText>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.status}>
        <ThemedText type="small" themeColor="textSecondary">
          Could not reach harmonica.com. Check your internet connection.
        </ThemedText>
        <ActionButton label="Try again" onPress={onRetry} />
      </View>
    );
  }
  return empty ? (
    <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
      No tab on harmonica.com matches.
    </ThemedText>
  ) : null;
}

export function SongsList() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const online = useOnlineTabIndex();

  const sections: Section[] = [
    {
      key: 'online',
      title: 'harmonica.com',
      data: searchSongs(query, online.items).map((song) => ({ kind: 'online', song })),
    },
    {
      key: 'library',
      title: 'Song library (works offline)',
      data: searchSongs(query, SONG_LIBRARY).map((song) => ({ kind: 'library', song })),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => `${row.kind}-${row.song.id}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by song or artist"
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        }
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
        )}
        renderSectionFooter={({ section }) =>
          section.key === 'online' ? (
            <OnlineStatus status={online.status} empty={section.data.length === 0} onRetry={online.retry} />
          ) : section.data.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
              No song in the library matches.
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openRow(item)}
            style={({ pressed }) => [styles.rowPressable, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="smallBold">{item.song.title}</ThemedText>
              {item.song.artist !== '' && (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.song.artist}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centred}>
              Have a tab from somewhere else? Type or paste it in.
            </ThemedText>
            <ActionButton label="Add your own tab" onPress={() => router.push('/saved/add')} />
          </View>
        }
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
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  search: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  rowPressable: {
    marginBottom: Spacing.two,
  },
  row: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  status: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  footer: {
    gap: Spacing.two,
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  centred: {
    textAlign: 'center',
  },
});
