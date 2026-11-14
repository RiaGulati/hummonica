/**
 * A tab with playback: "Play tab" (harmonica samples) and, when there is a
 * recording, "Play recording". The note being played is highlighted. Extra
 * buttons (Save, Share, ...) can be passed in and appear in the same row.
 */

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePlayback, type PlaybackSource } from '@/audio/playback';
import { ActionButton } from '@/components/action-button';
import { TabView } from '@/components/tab-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Tab } from '@/harmonica';

export function TabPlayer({
  tab,
  recordingUri = null,
  actions,
}: {
  tab: Tab;
  recordingUri?: string | null;
  actions?: ReactNode;
}) {
  const playback = usePlayback(tab, recordingUri);
  const playLabel = (source: PlaybackSource, label: string) =>
    playback.playing === source ? 'Pause' : label;

  return (
    <>
      <View style={styles.actions}>
        {tab.entries.length > 0 && (
          <ActionButton label={playLabel('tab', 'Play tab')} onPress={() => playback.toggle('tab')} />
        )}
        {recordingUri && (
          <ActionButton
            secondary
            label={playLabel('recording', 'Play recording')}
            onPress={() => playback.toggle('recording')}
          />
        )}
        {actions}
      </View>
      {tab.entries.length > 0 ? (
        <TabView tab={tab} activeIndex={playback.activeIndex} />
      ) : (
        <ThemedText themeColor="textSecondary">
          No notes were found. Try again closer to the sound, or in a quieter room.
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
