/**
 * Live pitch display: the note being heard, how sharp or flat it is, and
 * where that note is on a C harmonica.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { midiToName, nearestNote, type PitchFrame } from '@/dsp';
import { formatPosition, positionsFor } from '@/harmonica';
import { useTheme } from '@/hooks/use-theme';

const IN_TUNE_CENTS = 10;

function harmonicaHint(midi: number): string {
  const positions = positionsFor(midi, false);
  if (positions.length > 0) return positions.map(formatPosition).join(' or ');
  if (midi < 60) return 'below the harmonica (will be moved up an octave)';
  return 'not on a C harmonica without bends';
}

export function PitchMeter({ frame }: { frame: PitchFrame | null }) {
  const theme = useTheme();
  const note = frame?.voiced ? nearestNote(frame.frequency) : null;

  // Needle position: -50 cents at the far left, +50 at the far right.
  const needle = note ? 50 + note.cents : 50;
  const inTune = note !== null && Math.abs(note.cents) <= IN_TUNE_CENTS;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="title" style={styles.noteName}>
        {note ? midiToName(note.midi) : '--'}
      </ThemedText>

      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.centre, { backgroundColor: theme.textSecondary }]} />
        {note && (
          <View
            style={[
              styles.needle,
              { left: `${needle}%`, backgroundColor: inTune ? '#2FA84F' : '#E5484D' },
            ]}
          />
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {note && frame
          ? `${frame.frequency.toFixed(1)} Hz, ${note.cents >= 0 ? '+' : ''}${note.cents.toFixed(0)} cents`
          : 'waiting for a clear note'}
      </ThemedText>
      <ThemedText type="smallBold">{note ? harmonicaHint(note.midi) : ' '}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  noteName: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    alignSelf: 'stretch',
    height: 12,
    borderRadius: 6,
    marginVertical: Spacing.two,
  },
  centre: {
    position: 'absolute',
    left: '50%',
    width: 2,
    marginLeft: -1,
    top: -4,
    bottom: -4,
  },
  needle: {
    position: 'absolute',
    width: 6,
    marginLeft: -3,
    top: -6,
    bottom: -6,
    borderRadius: 3,
  },
});
