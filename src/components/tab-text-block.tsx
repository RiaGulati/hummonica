/**
 * Tab text exactly as written on a website, lyrics included. A fixed-width
 * font keeps the holes lined up above the words, and long lines scroll
 * sideways instead of wrapping.
 */

import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';

export function TabTextBlock({ text }: { text: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.box}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ThemedText style={styles.text}>{text}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  text: {
    fontFamily: Fonts?.mono,
    fontSize: 14,
    lineHeight: 20,
  },
});
