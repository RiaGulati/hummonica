/**
 * A small pop-up for typing a name, with Cancel and Save. (React Native's
 * Alert.prompt only exists on iOS, so this works on both platforms.)
 *
 * Show it by rendering it, and hide it by not rendering it:
 *   {naming && <NameDialog ... onCancel={() => setNaming(false)} />}
 * That way the text box starts fresh every time it opens.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Longest name allowed, so names fit in lists. */
export const MAX_NAME_LENGTH = 60;

export function NameDialog({
  title,
  initialName,
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
}: {
  title: string;
  initialName: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping outside the box cancels. */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable onPress={() => {}}>
          <ThemedView style={styles.box}>
            <ThemedText type="smallBold">{title}</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              selectTextOnFocus
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="done"
              onSubmitEditing={() => trimmed && onConfirm(trimmed)}
              placeholder="Name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <View style={styles.buttons}>
              <ActionButton label="Cancel" onPress={onCancel} />
              <ActionButton label={confirmLabel} disabled={!trimmed} onPress={() => onConfirm(trimmed)} />
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  box: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    fontSize: 17,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
