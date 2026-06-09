import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoGrid } from '@/components/BentoGrid';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries, queryEntriesBetween } from '@/db/repositories/entries';
import { queryGoalByMetric } from '@/db/repositories/goals';
import type { Entry } from '@/db/models/Entry';
import type { Goal } from '@/db/models/Goal';
import { POLE, METRIC, type HabitCheckPayload } from '@/poles/types';
import { startOfDay, endOfDay, formatDuration } from '@/lib/time';
import { POLES } from '@/poles/registry';
import { QuickAddBar } from '@/features/ai/QuickAddBar';

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

function weekStartMs(): number {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const focusGoals = useObservedQuery<Goal>(
    () => queryGoalByMetric(METRIC.focusHours),
    [],
    ['current_value', 'target_value'],
  );
  const habits = useObservedQuery<Entry>(() => queryEntries(POLE.planning, 'habit'), []);
  const todayChecks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'habit_check', startOfDay(), endOfDay()),
    [],
  );
  const todayBlocks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.work, 'time_block', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );
  const weekBlocks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.work, 'time_block', weekStartMs(), Date.now() + 86_400_000),
    [],
    ['payload'],
  );

  const todaySec = useMemo(
    () => todayBlocks.reduce((s, b) => s + (Number((b.payload as { durationSec?: number }).durationSec) || 0), 0),
    [todayBlocks],
  );
  const weekHours = useMemo(
    () => weekBlocks.reduce((s, b) => s + (Number((b.payload as { durationSec?: number }).durationSec) || 0), 0) / 3600,
    [weekBlocks],
  );
  const target = focusGoals[0]?.targetValue ?? 20;
  const pct = target > 0 ? Math.min(1, weekHours / target) : 0;

  // Only count checks that still map to an existing habit (deleted habits leave checks behind).
  const habitsDone = useMemo(() => {
    const ids = new Set(habits.map((h) => h.id));
    const checked = new Set(
      todayChecks
        .map((c) => (c.payload as HabitCheckPayload).habitId)
        .filter((id) => ids.has(id)),
    );
    return checked.size;
  }, [habits, todayChecks]);

  return (
    <Screen>
      <View style={{ marginBottom: theme.spacing(1) }}>
        <Text variant="display">Bonjour 👋</Text>
        <Text variant="body" color={theme.colors.inkSoft}>
          Voici ta journée en un coup d'œil.
        </Text>
      </View>

      <QuickAddBar />

      <Pressable
        onPress={() => router.push('/assistant')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
          marginTop: theme.spacing(3),
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.ink,
        }}
      >
        <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
        <Text variant="label" color={theme.colors.bg}>
          Parler à l'assistant
        </Text>
      </Pressable>

      <BentoGrid>
        <BentoCard tone="primary" span={1} tall subtitle="aujourd'hui" title="Focus" icon="time">
          <Text variant="stat" color={theme.colors.onPrimary}>
            {formatDuration(todaySec)}
          </Text>
        </BentoCard>

        <BentoCard tone="secondary" span={1} tall subtitle="aujourd'hui" title="Habitudes" icon="repeat">
          <Text variant="stat" color={theme.colors.ink}>
            {habitsDone} / {habits.length}
          </Text>
        </BentoCard>

        <BentoCard
          tone="accent"
          span={2}
          title="Focus de la semaine"
          icon="flag"
          subtitle={`${weekHours.toFixed(1)} / ${target} h · ${Math.round(pct * 100)}%`}
          onPress={() => router.push('/goals')}
        >
          <View
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: 'rgba(246,249,239,0.25)',
              overflow: 'hidden',
              marginTop: 4,
            }}
          >
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.colors.primary }} />
          </View>
        </BentoCard>
      </BentoGrid>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Tes pôles</Text>
      </View>
      <BentoGrid>
        {POLES.map((pole) => (
          <BentoCard
            key={pole.key}
            span={1}
            title={pole.label}
            subtitle={pole.tagline}
            icon={POLE_ICON[pole.key]}
            palette={theme.poleColors[pole.key]}
            seed={pole.label.length + 2}
            onPress={() => {
              if (pole.key === 'work') router.push('/work');
              else if (pole.key === 'planning') router.push('/planning');
              else if (pole.key === 'wellbeing') router.push('/wellbeing');
              else if (pole.key === 'finance') router.push('/finance');
              else if (pole.key === 'home') router.push('/household');
              else if (pole.key === 'relationships') router.push('/relationships');
              else if (pole.key === 'learning') router.push('/learning');
              else if (pole.key === 'leisure') router.push('/leisure');
              else router.push('/poles');
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.inkSoft} />
              <Text variant="label" color={theme.colors.inkSoft}>
                {pole.subPoles.length} outils
              </Text>
            </View>
          </BentoCard>
        ))}
      </BentoGrid>
    </Screen>
  );
}
