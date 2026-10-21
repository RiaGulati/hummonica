/**
 * The Listen screen: two buttons to start the microphone (one per mode), the
 * live pitch meter, and the harmonica tab for the last recording.
 */

import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PitchMeter } from '@/components/pitch-meter';
import { TabView } from '@/components/tab-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MAX_RECORDING_SECONDS, useMelodyCapture } from '@/audio/capture';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { TranscribeMode } from '@/dsp';
import { buildTab } from '@/harmonica';

const ACCENT = '#208AEF';
const STOP = '#E5484D';

const MODE_BUTTONS: { mode: TranscribeMode; label: string }[] = [
  { mode: 'voice', label: 'Hum / Play' },
  { mode: 'song', label: 'Song' },
];

const MODE_HINTS: Record<TranscribeMode, string> = {
  voice: 'Listening for one note at a time.',
  song: 'Listening for the lead melody in the music.',
};

export function ListenPanel() {
  const { status, mode, livePitch, elapsed, dspLoad, result, start, stop } = useMelodyCapture();
  const listening = status === 'listening';
  const tab = result ? buildTab(result.notes) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Listen</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centred}>
            {listening
              ? MODE_HINTS[mode]
              : 'Hum / Play: hum, sing, whistle or play one note at a time.\nSong: play recorded music with a clear lead melody.'}
          </ThemedText>

          <PitchMeter frame={livePitch} />

          <ThemedView style={styles.buttonRow}>
            {MODE_BUTTONS.map((button) => (
              <Pressable
                key={button.mode}
                accessibilityRole="button"
                onPress={listening ? stop : () => start(button.mode)}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: listening ? STOP : ACCENT, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText style={styles.buttonText}>{listening ? 'Stop' : button.label}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          {listening && (
            <ThemedText type="small" themeColor="textSecondary">
              {elapsed.toFixed(1)} s of {MAX_RECORDING_SECONDS} s · pitch detection load{' '}
              {(dspLoad * 100).toFixed(0)}%
            </ThemedText>
          )}
          {status === 'permission-denied' && (
            <ThemedText style={styles.centred}>
              Microphone access was denied. Allow it in the system settings and try again.
            </ThemedText>
          )}
          {status === 'error' && (
            <ThemedText style={styles.centred}>The microphone could not be started.</ThemedText>
          )}

          {result && tab && (
            <ThemedView type="backgroundElement" style={styles.result}>
              <ThemedText type="smallBold">
                {result.notes.length} notes in {result.duration.toFixed(1)} s (
                {result.mode === 'song' ? 'song' : 'hum / play'}, {result.sampleRate} Hz)
              </ThemedText>
              {tab.shift !== 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Moved {tab.shift > 0 ? 'up' : 'down'} {Math.abs(tab.shift)} semitones to fit
                  the harmonica.
                </ThemedText>
              )}
              <TabView tab={tab} />
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  centred: {
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  button: {
    minWidth: 150,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 999,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 700,
  },
  result: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
