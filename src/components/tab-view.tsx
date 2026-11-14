/**
 * Harmonica tab display.
 *
 * Notes are laid out left to right and wrap onto new lines like sheet music.
 * Rhythm is shown two ways: the space after each note and the bar under it
 * are short, medium or long to match the note's length, and a vertical bar
 * line marks a pause between phrases.
 *
 * Pinch (or use the - and + buttons) to zoom. Zooming changes the font size
 * rather than scaling the picture, so the lines re-wrap to fit the screen.
 */

import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Signal, Spacing } from '@/constants/theme';
import { midiToName } from '@/dsp';
import {
  classifyLengths,
  findPauses,
  formatPosition,
  type NoteLength,
  type Tab,
  type TabEntry,
} from '@/harmonica';
import { useTheme } from '@/hooks/use-theme';

const BASE_FONT_SIZE = 26;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;

/** Space after a note, in points at 100% zoom. */
const GAP_AFTER: Record<NoteLength, number> = { short: 4, medium: 12, long: 26 };
/** Width of the length bar under a note, in points at 100% zoom. */
const BAR_WIDTH: Record<NoteLength, number> = { short: 8, medium: 20, long: 40 };

const UNPLAYABLE_COLOR = Signal.warning;
/** The note being played: the brand peach. */
const ACTIVE_BACKGROUND = '#ffc396';

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function describe(entry: TabEntry): string {
  const { position } = entry;
  if (!position) return `${midiToName(entry.midi)}, not playable`;
  const bend = position.bend > 0 ? `, bent ${position.bend} semitone${position.bend > 1 ? 's' : ''}` : '';
  return `hole ${position.hole} ${position.breath}${bend}`;
}

export interface TabViewProps {
  tab: Tab;
  /** Index of the note to highlight (during playback). -1 for none. */
  activeIndex?: number;
}

export function TabView({ tab, activeIndex = -1 }: TabViewProps) {
  const theme = useTheme();
  const [zoom, setZoom] = useState(1);
  const [showNoteNames, setShowNoteNames] = useState(false);
  // runOnJS(true): run the callback as normal JavaScript so it can set React state.
  // scaleChange is how much the fingers spread since the previous update
  // (1.05 = 5% further apart), so we multiply the current zoom by it.
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onChange((event) => {
      setZoom((current) => clampZoom(current * event.scaleChange));
    });

  const lengths = classifyLengths(tab.entries);
  const pauses = findPauses(tab.entries);
  const fontSize = BASE_FONT_SIZE * zoom;

  if (tab.entries.length === 0) {
    return <ThemedText themeColor="textSecondary">No notes found.</ThemedText>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <ToolbarButton label="−" onPress={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.zoomLabel}>
          {Math.round(zoom * 100)}%
        </ThemedText>
        <ToolbarButton label="+" onPress={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} />
        <View style={styles.toolbarSpacer} />
        <ToolbarButton
          label={showNoteNames ? 'Hide notes' : 'Show notes'}
          onPress={() => setShowNoteNames((s) => !s)}
        />
      </View>

      <GestureDetector gesture={pinch}>
        <View style={[styles.lines, { rowGap: fontSize * 0.6 }]}>
          {tab.entries.map((entry, i) => {
            const length = lengths[i];
            const active = i === activeIndex;
            const playable = entry.position !== null;
            return (
              <Fragment key={i}>
                {pauses[i] && (
                  <View
                    style={[
                      styles.barLine,
                      {
                        height: fontSize * 1.2,
                        marginRight: GAP_AFTER.medium * zoom,
                        backgroundColor: theme.textSecondary,
                      },
                    ]}
                  />
                )}
                <View
                  accessible
                  accessibilityLabel={describe(entry)}
                  style={[
                    styles.note,
                    {
                      marginRight: GAP_AFTER[length] * zoom,
                      paddingHorizontal: 4 * zoom,
                      backgroundColor: active ? ACTIVE_BACKGROUND : 'transparent',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.symbol,
                      { fontSize, color: playable ? theme.text : UNPLAYABLE_COLOR },
                    ]}>
                    {formatPosition(entry.position)}
                  </Text>
                  <View
                    style={[
                      styles.lengthBar,
                      {
                        width: BAR_WIDTH[length] * zoom,
                        height: Math.max(2, 3 * zoom),
                        backgroundColor: theme.textSecondary,
                      },
                    ]}
                  />
                  {(showNoteNames || !playable) && (
                    <Text
                      style={{
                        fontSize: fontSize * 0.45,
                        color: playable ? theme.textSecondary : UNPLAYABLE_COLOR,
                      }}>
                      {midiToName(entry.midi)}
                    </Text>
                  )}
                </View>
              </Fragment>
            );
          })}
        </View>
      </GestureDetector>

      <ThemedText type="small" themeColor="textSecondary">
        ↑ blow · ↓ draw · {"'"} bend (one per semitone) · ✕ not playable · bar under a note shows its
        length · | pause
      </ThemedText>
    </View>
  );
}

function ToolbarButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarButton,
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
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toolbarSpacer: {
    flex: 1,
  },
  toolbarButton: {
    minWidth: 36,
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  zoomLabel: {
    minWidth: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  lines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  note: {
    alignItems: 'center',
    borderRadius: 6,
  },
  symbol: {
    fontFamily: Fonts.monoMedium,
    fontVariant: ['tabular-nums'],
  },
  lengthBar: {
    borderRadius: 2,
    marginTop: 2,
  },
  barLine: {
    width: 2,
    borderRadius: 1,
  },
});
