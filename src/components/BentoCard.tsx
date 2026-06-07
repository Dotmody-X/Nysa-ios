import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Blob } from './Blob';
import { GRID_GAP } from './BentoGrid';

type Tone = 'surface' | 'primary' | 'secondary' | 'accent';
type AccentTone = 'primary' | 'secondary' | 'accent';
type Span = 1 | 2;
type Palette = { solid: string; layers: string[]; on: string };

type BentoCardProps = {
  title?: string;
  subtitle?: string;
  tone?: Tone;
  span?: Span; // 1 = half width, 2 = full width
  tall?: boolean;
  /** Optional icon badge (the round "casse") shown top-left. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Color family for badge + blob on white cards. Defaults to the card tone. */
  accent?: AccentTone;
  /** A per-pole color set (overrides `accent` on white cards). */
  palette?: Palette;
  blob?: boolean;
  seed?: number;
  onPress?: () => void;
  children?: React.ReactNode;
};

export function BentoCard({
  title,
  subtitle,
  tone = 'surface',
  span = 1,
  tall = false,
  icon,
  accent,
  palette,
  blob = true,
  seed = 3,
  onPress,
  children,
}: BentoCardProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const available = Math.min(width, 640) - 40; // Screen h-padding = spacing(5)*2
  const halfWidth = (available - GRID_GAP) / 2;
  const cardWidth = span === 2 ? available : halfWidth;

  const isColored = tone !== 'surface';
  const accentTone: AccentTone = accent ?? (isColored ? (tone as AccentTone) : 'secondary');

  const fg = {
    surface: theme.colors.ink,
    primary: theme.colors.onPrimary,
    secondary: theme.colors.ink,
    accent: theme.colors.onAccent,
  }[tone];

  // Decorative blob layers: white tints on colored cards, the pole/accent palette on white cards.
  const blobColors = isColored
    ? ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.10)']
    : palette
      ? palette.layers
      : theme.blobs[accentTone];

  // Icon badge ("casse"): solid disc with a contrasting glyph.
  const badgeBg = isColored
    ? theme.colors.surface
    : palette
      ? palette.solid
      : theme.colors[accentTone];
  const badgeFg = isColored
    ? theme.colors[accentTone]
    : palette
      ? palette.on
      : accentTone === 'primary'
        ? theme.colors.ink
        : theme.colors.bg;

  const body = (
    <MotiView
      from={{ opacity: 0, translateY: 10, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing', duration: theme.durations.base }}
      style={{
        width: cardWidth,
        minHeight: tall ? 190 : 124,
        borderRadius: theme.radius.bento,
        backgroundColor: isColored ? theme.colors[tone] : theme.colors.surface,
        borderWidth: isColored ? 0 : 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      {blob ? (
        <Blob
          colors={blobColors}
          size={tall ? 230 : 180}
          seed={seed}
          opacity={isColored ? 1 : 0.9}
          style={{ position: 'absolute', top: tall ? -70 : -56, right: -64 }}
        />
      ) : null}

      <View style={{ padding: theme.spacing(5), justifyContent: 'space-between', flex: 1 }}>
        {icon ? (
          // Halo ring in the page background colour = the "renfoncement" (notch)
          // that makes the badge read as carved into the card.
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing(5),
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: theme.radius.pill,
                backgroundColor: badgeBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={icon} size={20} color={badgeFg} />
            </View>
          </View>
        ) : null}

        <View>
          {title ? (
            <Text variant="title" color={fg}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" color={fg} style={{ opacity: 0.75, marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
          {children ? <View style={{ marginTop: theme.spacing(3) }}>{children}</View> : null}
        </View>
      </View>
    </MotiView>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {body}
    </Pressable>
  );
}
