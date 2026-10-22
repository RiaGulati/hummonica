/**
 * One saved transcription: details, playback and share buttons, and the tab.
 * Shown under the Listen buttons after a recording, and on the History
 * detail screen.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePlayback, type PlaybackSource } from '@/audio/playback';
import { shareRecording } from '@/audio/share';
import { TabView } from '@/components/tab-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { buildTab, unplayableHint } from '@/harmonica';
import { useTheme } from '@/hooks/use-theme';
import { useTabSettings } from '@/settings/store';
import { recordingUri, type SavedTranscription } from '@/storage/transcriptions';

export function TranscriptionView({ saved }: { saved: SavedTranscription }) {
  // The tab is rebuilt from the saved notes, so it always uses the current settings.
  const settings = useTabSettings();
  const tab = buildTab(saved.notes, settings);
  const hint = unplayableHint(tab, settings);
  const recording = recordingUri(saved);
  const playback = usePlayback(tab, recording);
  const [shareError, setShareError] = useState<string | null>(null);

  async function share() {
    setShareError(null);
    try {
      await shareRecording(saved);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Could not share the recording');
    }
  }

  const playLabel = (source: PlaybackSource, label: string) =>
    playback.playing === source ? 'Pause' : label;

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

      <View style={styles.actions}>
        {tab.entries.length > 0 && (
          <ActionButton label={playLabel('tab', 'Play tab')} onPress={() => playback.toggle('tab')} />
        )}
        {recording && (
          <ActionButton
            label={playLabel('recording', 'Play recording')}
            onPress={() => playback.toggle('recording')}
          />
        )}
        {recording && <ActionButton label="Share recording" onPress={share} />}
      </View>
      {shareError && (
        <ThemedText type="small" themeColor="textSecondary">
          {shareError}
        </ThemedText>
      )}

      {tab.entries.length > 0 ? (
        <TabView tab={tab} activeIndex={playback.activeIndex} />
      ) : (
        <ThemedText themeColor="textSecondary">
          No notes were found. Try again closer to the sound, or in a quieter room.
        </ThemedText>
      )}
    </ThemedView>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
});
