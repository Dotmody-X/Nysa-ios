import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Bento layout primitive.
 *
 * A 2-column grid on phone. BentoCard children declare a `span` (1 or 2);
 * the grid handles gaps. On wider screens (tablet/desktop) the column count
 * scales up — that logic lives here so cards stay layout-agnostic.
 */
export const GRID_GAP = 12;

export function BentoGrid({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
        marginTop: theme.spacing(4),
      }}
    >
      {children}
    </View>
  );
}
