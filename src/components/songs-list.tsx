/**
 * The Songs screen: search the built-in song library by title or artist.
 * For songs that are not in the library, the user can search harmonica.com in
 * the browser, or type in a tab themselves.
 */

import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SONG_LIBRARY } from '@/songs/library';
import { searchSongs } from '@/songs/search';

function searchOnline(query: string) {
  const url = `https://www.harmonica.com/?s=${encodeURIComponent(query.trim())}`;
  WebBrowser.openBrowserAsync(url).catch((error) => console.warn('Could not open the browser', error));
}

export function SongsList() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const results = searchSongs(query, SONG_LIBRARY);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(song) => song.id}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
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
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/songs/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.artist}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centred}>
              {results.length === 0 ? 'No song in the library matches.' : 'Not the song you want?'}{' '}
              The library has well-known public domain songs. For other songs, look up the tab
              online and add it yourself.
            </ThemedText>
            <View style={styles.footerButtons}>
              <ActionButton
                label={query.trim() ? `Search harmonica.com for "${query.trim()}"` : 'Open harmonica.com tabs'}
                onPress={() =>
                  query.trim()
                    ? searchOnline(query)
                    : WebBrowser.openBrowserAsync('https://www.harmonica.com/songs/tabs/')
                }
              />
              <ActionButton label="Add your own tab" onPress={() => router.push('/saved/add')} />
            </View>
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
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  search: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  row: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  footer: {
    gap: Spacing.three,
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centred: {
    textAlign: 'center',
  },
});
