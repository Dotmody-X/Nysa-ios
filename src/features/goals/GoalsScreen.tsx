import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryGoals } from '@/db/repositories/goals';
import type { Goal } from '@/db/models/Goal';

export function GoalsScreen() {
  const { theme } = useTheme();
  const goals = useObservedQuery<Goal>(() => queryGoals(), [], ['current_value', 'target_value', 'title']);

  return (
    <Screen>
      <Text variant="display">Objectifs</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Transverses à tous les pôles.
      </Text>

      <View style={{ marginTop: theme.spacing(5), gap: 12 }}>
        {goals.length === 0 ? (
          <BentoCard span={2} title="Aucun objectif" subtitle="Ils se créeront avec tes pôles." />
        ) : (
          goals.map((goal) => {
            const target = goal.targetValue ?? 0;
            const pct = target > 0 ? Math.min(1, goal.currentValue / target) : 0;
            return (
              <BentoCard
                key={goal.id}
                tone="surface"
                span={2}
                title={goal.title}
                subtitle={`${goal.currentValue.toFixed(1)} / ${target} ${goal.unit ?? ''} · ${Math.round(pct * 100)}%`}
              >
                <View
                  style={{
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: theme.colors.surfaceAlt,
                    overflow: 'hidden',
                    marginTop: 4,
                  }}
                >
                  <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.colors.primary }} />
                </View>
              </BentoCard>
            );
          })
        )}
      </View>
    </Screen>
  );
}
