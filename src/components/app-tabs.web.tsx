/**
 * The web version's navigation: a pill-shaped bar at the top with the
 * Hummonica logo (back to the landing page) and the app's five tabs. It sits
 * above the screens rather than over them, and is hidden on the landing page,
 * which has its own header.
 */

import { usePathname } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { HummonicaMark } from './hummonica-mark';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const onLanding = usePathname() === '/';
  return (
    <Tabs>
      <TabList asChild style={onLanding ? styles.hidden : undefined}>
        <CustomTabList>
          {/* The landing page is a route too, but it has no button: the logo leads there. */}
          <TabTrigger name="index" href="/" style={styles.hidden} />
          <TabTrigger name="listen" href="/listen" asChild>
            <TabButton>Listen</TabButton>
          </TabTrigger>
          <TabTrigger name="songs" href="/songs" asChild>
            <TabButton>Songs</TabButton>
          </TabTrigger>
          <TabTrigger name="saved" href="/saved" asChild>
            <TabButton>Saved</TabButton>
          </TabTrigger>
          <TabTrigger name="history" href="/history" asChild>
            <TabButton>History</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      {/* Below the bar, not under it, so screen headers and titles stay visible. */}
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

/** Below this width the bar drops the logo's name and tightens the tabs, so all five fit on a phone. */
const COMPACT_WIDTH = 640;

export function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  return (
    <Pressable
      {...props}
      // TabTriggerSlotProps types `ref` loosely; it's forwarded to the Pressable's host view.
      ref={ref as React.Ref<React.ComponentRef<typeof Pressable>>}
      style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          compact && styles.tabButtonCompact,
          isFocused && { backgroundColor: theme.accent },
        ]}>
        <ThemedText
          type="small"
          style={{
            color: isFocused ? theme.onAccent : theme.text,
            fontFamily: isFocused ? Fonts.monoMedium : Fonts.mono,
            fontSize: compact ? 12 : 14,
          }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  return (
    // Our layout goes last: TabList's default style would otherwise left-align the bar.
    <View {...props} style={[props.style, styles.tabListContainer, compact && styles.tabListCompact]}>
      <ThemedView type="backgroundElement" style={[styles.innerContainer, compact && styles.innerCompact]}>
        <a href="/" style={{ textDecoration: 'none', marginRight: 'auto' }} aria-label="Hummonica home">
          <View style={styles.brand}>
            <HummonicaMark size={26} />
            {!compact && <ThemedText style={styles.brandText}>Hummonica</ThemedText>}
          </View>
        </a>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    display: 'none',
  },
  slot: {
    flex: 1,
  },
  tabListContainer: {
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.four,
    paddingRight: Spacing.two,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    boxShadow: '0 1px 2px rgba(20, 19, 20, 0.08), 0 8px 24px -12px rgba(20, 19, 20, 0.25)',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandText: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  tabButtonCompact: {
    paddingHorizontal: Spacing.two,
  },
  tabListCompact: {
    padding: Spacing.two,
  },
  innerCompact: {
    paddingLeft: Spacing.two,
    paddingRight: Spacing.one,
    gap: 0,
  },
});
