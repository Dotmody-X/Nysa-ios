import React, { useEffect, useRef } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

const ITEM_H = 44;
const VISIBLE = 3; // odd number → one centered

/** A snap scroll wheel (iOS-style) — pure JS, themed. */
export function WheelPicker({
  values,
  index,
  onChange,
}: {
  values: string[];
  index: number;
  onChange: (i: number) => void;
}) {
  const { theme } = useTheme();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    if (i !== index) onChange(i);
  };

  return (
    <View style={{ height: ITEM_H * VISIBLE, flex: 1, overflow: 'hidden' }}>
      {/* center selection band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_H,
          left: 6,
          right: 6,
          height: ITEM_H,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
      >
        {values.map((v, i) => (
          <View key={i} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="title" color={i === index ? theme.colors.ink : theme.colors.muted}>
              {v}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
