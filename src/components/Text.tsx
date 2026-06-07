import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'display' | 'title' | 'body' | 'label' | 'stat' | 'caption';

const VARIANTS: Record<
  Variant,
  { font: 'display' | 'body' | 'accent'; size: number; lineHeight: number; weight?: string }
> = {
  display: { font: 'display', size: 34, lineHeight: 38 },
  title: { font: 'display', size: 22, lineHeight: 26 },
  body: { font: 'body', size: 16, lineHeight: 24 },
  label: { font: 'accent', size: 13, lineHeight: 16 },
  stat: { font: 'accent', size: 30, lineHeight: 34 },
  caption: { font: 'body', size: 12, lineHeight: 16 },
};

type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
};

/** Themed text. Always use this instead of RN's <Text> so type + theme stay consistent. */
export function Text({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const { theme } = useTheme();
  const v = VARIANTS[variant];
  return (
    <RNText
      style={[
        {
          fontFamily: theme.fonts[v.font],
          fontSize: v.size,
          lineHeight: v.lineHeight,
          color: color ?? theme.colors.ink,
        },
        style,
      ]}
      {...rest}
    />
  );
}
