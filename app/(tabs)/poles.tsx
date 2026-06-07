import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoGrid } from '@/components/BentoGrid';
import { BentoCard } from '@/components/BentoCard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { POLES } from '@/poles/registry';

const POLE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  planning: 'calendar',
  work: 'briefcase',
  wellbeing: 'heart',
  finance: 'wallet',
  home: 'home',
  learning: 'book',
  relationships: 'people',
  leisure: 'game-controller',
};

export default function PolesScreen() {
  const { theme } = useTheme();

  return (
    <Screen>
      <Text variant="display">Pôles</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Tous tes domaines, interconnectés.
      </Text>

      {POLES.map((pole) => {
        const palette = theme.poleColors[pole.key];
        return (
          <View key={pole.key} style={{ marginTop: theme.spacing(6) }}>
            <BentoCard
              span={2}
              title={pole.label}
              subtitle={pole.tagline}
              icon={POLE_ICON[pole.key]}
              palette={palette}
            />
            <BentoGrid>
              {pole.subPoles.map((sub) => (
                <BentoCard
                  key={sub.key}
                  span={1}
                  title={sub.label}
                  subtitle={`Phase ${sub.phase}`}
                  palette={palette}
                  blob={false}
                />
              ))}
            </BentoGrid>
          </View>
        );
      })}
    </Screen>
  );
}
