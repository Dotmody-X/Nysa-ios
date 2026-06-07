import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import {
  queryEntries,
  queryEntriesBetween,
  createEntry,
  patchPayload,
  softDeleteEntry,
} from '@/db/repositories/entries';
import { createLink } from '@/db/repositories/links';
import type { Entry } from '@/db/models/Entry';
import {
  POLE,
  RELATION,
  type CalendarEventPayload,
  type HabitPayload,
  type HabitCheckPayload,
} from '@/poles/types';
import { startOfDay, endOfDay, isoDate } from '@/lib/time';

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function PlanningScreen() {
  const { theme } = useTheme();

  const events = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'calendar_event', startOfDay(), endOfDay()),
    [],
    ['payload', 'title'],
  );
  const habits = useObservedQuery<Entry>(() => queryEntries(POLE.planning, 'habit'), [], ['title', 'payload']);
  const checks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'habit_check', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );

  const checkedHabitIds = useMemo(
    () => new Set(checks.map((c) => (c.payload as HabitCheckPayload).habitId)),
    [checks],
  );

  const toggleHabit = async (habit: Entry) => {
    const existing = checks.find((c) => (c.payload as HabitCheckPayload).habitId === habit.id);
    const streak = (habit.payload as HabitPayload).streak ?? 0;
    if (existing) {
      await softDeleteEntry(existing);
      await patchPayload<'habit'>(habit, { streak: Math.max(0, streak - 1) });
    } else {
      const check = await createEntry({
        poleId: POLE.planning,
        type: 'habit_check',
        title: habit.title,
        payload: { habitId: habit.id, date: isoDate() },
      });
      await createLink(check.id, habit.id, RELATION.checks);
      await patchPayload<'habit'>(habit, { streak: streak + 1 });
    }
  };

  return (
    <Screen>
      <Text variant="display">Planning</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Aujourd'hui
      </Text>

      {/* Today's timeline — focus sessions land here automatically from Travail */}
      <View style={{ marginTop: theme.spacing(5), gap: 10 }}>
        {events.length === 0 ? (
          <BentoCard span={2} title="Journée libre" subtitle="Lance une session dans Travail — elle apparaîtra ici." />
        ) : (
          events.map((ev) => {
            const p = ev.payload as CalendarEventPayload;
            return (
              <View
                key={ev.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: theme.spacing(4),
                }}
              >
                <View style={{ width: 4, height: 36, borderRadius: 999, backgroundColor: theme.colors.primary }} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{ev.title}</Text>
                  <Text variant="label" color={theme.colors.muted}>
                    {timeLabel(p.start)} – {timeLabel(p.end)}
                  </Text>
                </View>
                <Ionicons name="link" size={16} color={theme.colors.muted} />
              </View>
            );
          })
        )}
      </View>

      {/* Habit tracker */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Habitudes</Text>
        <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
          {habits.map((habit) => {
            const checked = checkedHabitIds.has(habit.id);
            const streak = (habit.payload as HabitPayload).streak ?? 0;
            const icon = (habit.payload as HabitPayload).icon as keyof typeof Ionicons.glyphMap;
            return (
              <Pressable
                key={habit.id}
                onPress={() => toggleHabit(habit)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: checked ? theme.colors.primary : theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: theme.spacing(4),
                }}
              >
                <Ionicons name={icon ?? 'ellipse'} size={22} color={theme.colors.ink} />
                <Text variant="body" style={{ flex: 1 }}>
                  {habit.title}
                </Text>
                <Text variant="label" color={checked ? theme.colors.onPrimary : theme.colors.muted}>
                  🔥 {streak}
                </Text>
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={checked ? theme.colors.ink : theme.colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
