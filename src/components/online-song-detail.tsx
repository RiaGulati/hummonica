/**
 * A tab from harmonica.com, downloaded when the screen opens: the page's
 * facts (such as which harmonica to use), a playable version of the tab with
 * a Save button, the tab exactly as written (with lyrics) and a link to the
 * original page.
 */

import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { NameDialog } from '@/components/name-dialog';
import { TabPlayer } from '@/components/tab-player';
import { TabTextBlock } from '@/components/tab-text-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { readTabText, tabFromText } from '@/songs/online-format';
import { useOnlineTab } from '@/songs/use-online-tabs';
import { saveTab } from '@/storage/saved-tabs';

export function OnlineSongDetail({ id, title }: { id: number; title?: string }) {
  const { status, tab: page, retry } = useOnlineTab(id);
  const [naming, setNaming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!page) {
    return (
      <ThemedView style={styles.centre}>
        <Stack.Screen options={{ title: title ?? '' }} />
        {status === 'loading' ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText themeColor="textSecondary" style={styles.centredText}>
              The tab could not be loaded from harmonica.com. Check your internet connection.
            </ThemedText>
            <ActionButton label="Try again" onPress={retry} />
          </>
        )}
      </ThemedView>
    );
  }

  const text = page.blocks.join('\n\n');
  const tab = tabFromText(text);
  const { unreadable } = readTabText(text);

  function save(name: string) {
    setNaming(false);
    try {
      saveTab({ name, source: 'online', tab, sourceText: text, sourceUrl: page!.url });
      setMessage(`Saved as "${name}" in Saved.`);
    } catch (error) {
      console.warn('Could not save the tab', error);
      setMessage('The tab could not be saved.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: page.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{page.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {page.artist} · from harmonica.com
          </ThemedText>
          {page.facts.map((fact) => (
            <ThemedText key={fact} type="small" themeColor="textSecondary">
              {fact}
            </ThemedText>
          ))}
          {unreadable > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {unreadable} symbol{unreadable === 1 ? '' : 's'} could not be read for playback (see the
              tab as written below).
            </ThemedText>
          )}
          {message && <ThemedText type="smallBold">{message}</ThemedText>}
          <TabPlayer tab={tab} actions={<ActionButton label="Save tab" onPress={() => setNaming(true)} />} />
        </ThemedView>

        <ThemedText type="smallBold">Tab as written</ThemedText>
        {page.blocks.map((block, i) => (
          <TabTextBlock key={i} text={block} />
        ))}
        <ActionButton label="Open on harmonica.com" onPress={() => WebBrowser.openBrowserAsync(page.url)} />
      </ScrollView>
      {naming && (
        <NameDialog
          title="Name this tab"
          initialName={page.title}
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
    alignItems: 'stretch',
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centredText: {
    textAlign: 'center',
  },
});
