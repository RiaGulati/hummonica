/**
 * Add a tab by typing or pasting it, for example one looked up on a website
 * for personal practice. The holes are kept exactly as written, and a preview
 * (with playback) shows while typing.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { MAX_NAME_LENGTH } from '@/components/name-dialog';
import { TabPlayer } from '@/components/tab-player';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { parseTabPositions, type Tab } from '@/harmonica';
import { useTheme } from '@/hooks/use-theme';
import { tabFromPositions } from '@/storage/saved-tab-format';
import { saveTab } from '@/storage/saved-tabs';

/** Read the typed text. Returns the tab, or an error message to show. */
function readTab(text: string): { tab: Tab | null; error: string | null } {
  if (!text.trim()) return { tab: null, error: null };
  try {
    return { tab: tabFromPositions(parseTabPositions(text)), error: null };
  } catch (error) {
    return { tab: null, error: error instanceof Error ? error.message : 'Cannot read this tab' };
  }
}

export function AddTab() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const { tab, error } = readTab(text);
  const canSave = tab !== null && name.trim() !== '';

  function save() {
    if (!tab) return;
    try {
      const saved = saveTab({ name, source: 'typed', tab });
      router.replace({ pathname: '/saved/[id]', params: { id: saved.id } });
    } catch (err) {
      console.warn('Could not save the tab', err);
      setSaveError('The tab could not be saved.');
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <ThemedText type="smallBold">Name</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH}
          placeholder="For example: Piano Man intro"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />

        <ThemedText type="smallBold">Tab</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Holes for a C harmonica, separated by spaces: 4 or 4↑ is blow, -4 or 4↓ is draw, and -3&apos;
          is a bend.
        </ThemedText>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="6 -6 6 -5 5 -5 5"
          placeholderTextColor={theme.textSecondary}
          style={[inputStyle, styles.tabInput]}
        />
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {tab && (
          <ThemedView type="backgroundElement" style={styles.preview}>
            <ThemedText type="smallBold">Preview</ThemedText>
            <TabPlayer tab={tab} />
          </ThemedView>
        )}

        <View style={styles.saveRow}>
          <ActionButton label="Save tab" disabled={!canSave} onPress={save} />
          {!canSave && tab && (
            <ThemedText type="small" themeColor="textSecondary">
              Give the tab a name to save it.
            </ThemedText>
          )}
        </View>
        {saveError && <ThemedText style={styles.error}>{saveError}</ThemedText>}
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
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  input: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  tabInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: '#E5484D',
  },
  preview: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
