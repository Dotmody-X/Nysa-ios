import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/** Readable text color (ink or cream) over a solid background hex. */
export function fgOn(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#1A0708';
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6 ? '#1A0708' : '#F6F9EF';
}

/**
 * "Classification" card — a full-width tile that stacks under the previous one
 * with a little grip handle, a bold title + subtitle, and a circular progress
 * ring on the right. Inspired by stacked-list workout UIs.
 */
export function StackedCard({
  title,
  subtitle,
  center,
  progress = 0,
  bg,
  fg,
  ring,
  onPress,
  withHandle = true,
  chevron = false,
}: {
  title: string;
  subtitle?: string;
  /** Text shown in the middle of the ring (e.g. a count). */
  center?: string;
  progress?: number; // 0..1
  bg: string;
  fg: string;
  ring: string;
  onPress?: () => void;
  withHandle?: boolean;
  /** Navigation card: show a chevron instead of the progress ring. */
  chevron?: boolean;
}) {
  const { theme } = useTheme();
  const R = 26;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <Pressable onPress={onPress} style={{ marginTop: withHandle ? -20 : 0 }}>
      {withHandle ? (
        <View
          style={{
            alignSelf: 'center',
            width: 44,
            height: 6,
            borderRadius: 999,
            backgroundColor: fg,
            opacity: 0.25,
            marginBottom: 6,
            zIndex: 2,
          }}
        />
      ) : null}
      <View
        style={{
          backgroundColor: bg,
          borderRadius: 30,
          paddingVertical: theme.spacing(5),
          paddingHorizontal: theme.spacing(5),
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="title" color={fg}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="label" color={fg} style={{ opacity: 0.7, marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {chevron ? (
          <Ionicons name="chevron-forward" size={24} color={fg} style={{ opacity: 0.7 }} />
        ) : (
        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={64} height={64} style={{ position: 'absolute' }}>
            <Circle cx={32} cy={32} r={R} stroke={fg} strokeOpacity={0.18} strokeWidth={5} fill="none" />
            <Circle
              cx={32}
              cy={32}
              r={R}
              stroke={ring}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 32 32)"
            />
          </Svg>
          {center != null ? (
            <Text variant="label" color={fg} style={{ fontFamily: theme.fonts.accent, fontSize: 16 }}>
              {center}
            </Text>
          ) : null}
        </View>
        )}
      </View>
    </Pressable>
  );
}
