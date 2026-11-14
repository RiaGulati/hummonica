/**
 * A pill button for actions such as Play, Save and Share. Filled with the
 * brand peach; `secondary` is outlined, for the less important action in a row.
 */

import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary
          ? { borderColor: theme.textSecondary, backgroundColor: pressed ? theme.backgroundElement : 'transparent' }
          : { borderColor: theme.accent, backgroundColor: theme.accent },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: secondary ? theme.text : theme.onAccent }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
});
