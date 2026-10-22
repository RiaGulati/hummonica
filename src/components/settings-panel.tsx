/**
 * The Settings screen: how tabs are written. Changes apply straight away to
 * every tab in the app, including saved ones in History, because tabs are
 * rebuilt from the saved notes.
 */

import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { TransposeMode } from '@/harmonica';
import { useTheme } from '@/hooks/use-theme';
import { updateSettings, useTabSettings } from '@/settings/store';

const TRANSPOSE_CHOICES: { mode: TransposeMode; label: string; description: string }[] = [
  { mode: 'none', label: 'Off', description: 'Keep the notes exactly as heard.' },
  {
    mode: 'octave',
    label: 'Octaves',
    description: 'Move the tune up or down whole octaves to fit. It still sounds the same.',
  },
  {
    mode: 'any',
    label: 'Any key',
    description:
      'Also change the key, so songs that are not in C can be played on a C harmonica. ' +
      'Use this when notes show ✕.',
  },
];

export function SettingsPanel() {
  const settings = useTabSettings();
  const theme = useTheme();
  const chosen = TRANSPOSE_CHOICES.find((choice) => choice.mode === settings.transpose);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.section}>
          <View style={styles.row}>
            <ThemedText type="smallBold" style={styles.rowLabel}>
              Bends
            </ThemedText>
            <Switch
              value={settings.allowBends}
              onValueChange={(allowBends) => updateSettings({ allowBends })}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Use bent notes (for example 3↓&apos;&apos;) for notes the harmonica cannot play
            directly. Bending takes practice, so this is off by default.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold">Transpose</ThemedText>
          <View style={[styles.segments, { backgroundColor: theme.background }]}>
            {TRANSPOSE_CHOICES.map((choice) => {
              const selected = choice.mode === settings.transpose;
              return (
                <Pressable
                  key={choice.mode}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => updateSettings({ transpose: choice.mode })}
                  style={[
                    styles.segment,
                    selected && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText
                    type={selected ? 'smallBold' : 'small'}
                    themeColor={selected ? 'text' : 'textSecondary'}>
                    {choice.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {chosen?.description}
          </ThemedText>
        </ThemedView>
      </ScrollView>
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
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  section: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  segments: {
    flexDirection: 'row',
    padding: Spacing.half,
    borderRadius: Spacing.two,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - 2,
  },
});
