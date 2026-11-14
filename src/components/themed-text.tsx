import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    lineHeight: 21,
  },
  smallBold: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    lineHeight: 21,
  },
  default: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    lineHeight: 25,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.2,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  link: {
    fontFamily: Fonts.mono,
    lineHeight: 30,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    fontFamily: Fonts.monoMedium,
    lineHeight: 30,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
  },
});
