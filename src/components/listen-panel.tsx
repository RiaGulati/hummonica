/**
 * The Listen screen: a button to start and stop the microphone, the live
 * pitch meter, and (for now) a plain-text preview of the result. The full tab
 * view replaces the preview in the next milestone.
 */

import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PitchMeter } from '@/components/pitch-meter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MAX_RECORDING_SECONDS, useMelodyCapture } from '@/audio/capture';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { midiToName } from '@/dsp';
import { buildTab, formatTab } from '@/harmonica';

const ACCENT = '#208AEF';
const STOP = '#E5484D';

export function ListenPanel() {
  const { status, livePitch, elapsed, dspLoad, result, start, stop } = useMelodyCapture();
  const listening = status === 'listening';
  const tab = result ? buildTab(result.notes) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Listen</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centred}>
            Play or hum a melody, one note at a time.
          </ThemedText>

          <PitchMeter frame={livePitch} />

          <Pressable
            accessibilityRole="button"
            onPress={listening ? stop : start}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: listening ? STOP : ACCENT, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText style={styles.buttonText}>{listening ? 'Stop' : 'Listen'}</ThemedText>
          </Pressable>

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
                {result.sampleRate} Hz)
              </ThemedText>
              {tab.shift !== 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Moved {tab.shift > 0 ? 'up' : 'down'} {Math.abs(tab.shift)} semitones to fit
                  the harmonica.
                </ThemedText>
              )}
              <ThemedText style={styles.tab}>{formatTab(tab) || 'No notes found.'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {result.notes.map((n) => midiToName(n.midi)).join(' ')}
              </ThemedText>
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
  button: {
    minWidth: 180,
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
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  tab: {
    fontSize: 22,
    lineHeight: 34,
  },
});
