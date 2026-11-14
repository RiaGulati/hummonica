/**
 * Hummonica's look, shared by the app and the landing page: a pale blue-grey
 * ground, peach pill buttons, IBM Plex Sans for headings and IBM Plex Mono
 * for everything you read. Every text colour below clears WCAG AA (4.5:1) on
 * both `background` and `backgroundElement` in its mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#f2f7fc',
    /** Cards, rows and inputs. */
    backgroundElement: '#e6ebf1',
    backgroundSelected: '#d9dfe6',
    textSecondary: '#3b3b3b',
    /** Lines between groups, input borders. */
    hairline: '#d3d8dd',
    /** The brand colour: filled buttons. */
    accent: '#ffc396',
    /** Text on `accent`. */
    onAccent: '#040404',
  },
  dark: {
    text: '#fcfcfd',
    background: '#141314',
    backgroundElement: '#211f22',
    backgroundSelected: '#2e2c30',
    textSecondary: '#d6d4d8',
    hairline: '#3a383c',
    accent: '#ffc396',
    onAccent: '#040404',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Font families, one per weight: on iOS and Android a custom font's weights
 * are separate families, so `fontWeight` cannot pick them. Loaded in the root
 * layout with useFonts.
 */
export const Fonts = {
  /** Headings. */
  display: 'IBMPlexSans_500Medium',
  displayBold: 'IBMPlexSans_600SemiBold',
  /** Body text, labels and tabs. */
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

/** The two fixed reds of the app: Stop and things that cannot be played. */
export const Signal = {
  stop: '#c2353b',
  warning: '#c2353b',
  good: '#2a8f46',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Card corners. Buttons are pills (999). */
export const Radius = 16;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
