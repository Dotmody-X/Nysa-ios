import React, { useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
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
import { addEvent, deleteEvent, updateEvent } from './planning';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY = 86_400_000;
const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
// Local-date key (avoids the UTC day-shift that isoDate() causes in +UTC timezones).
const dayKeyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function PlanningScreen() {
  const { theme } = useTheme();
  const palette = theme.poleColors.planning;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<number | null>(startOfDay());

  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 1).getTime();

  const events = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'calendar_event', monthStart, monthEnd),
    [year, month],
    ['payload', 'title'],
  );
  const habits = useObservedQuery<Entry>(() => queryEntries(POLE.planning, 'habit'), [], ['title', 'payload']);
  const checks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'habit_check', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );

  const eventsByDay = useMemo(() => {
    const m: Record<number, Entry[]> = {};
    for (const e of events) {
      const d = new Date((e.payload as CalendarEventPayload).start).getDate();
      (m[d] ??= []).push(e);
    }
    return m;
  }, [events]);

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const todayKey = dayKeyOf(new Date());
  const selectedEvents = useMemo(() => {
    if (selected == null) return [];
    return events
      .filter((e) => {
        const s = (e.payload as CalendarEventPayload).start;
        return s >= selected && s < selected + DAY;
      })
      .sort((a, b) => (a.payload as CalendarEventPayload).start - (b.payload as CalendarEventPayload).start);
  }, [events, selected]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const [editing, setEditing] = useState<{ day: number; entry?: Entry } | null>(null);

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
  const checkedHabitIds = useMemo(() => new Set(checks.map((c) => (c.payload as HabitCheckPayload).habitId)), [checks]);

  return (
    <Screen>
      <Text variant="display">Planning</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Ton calendrier, ton temps.
      </Text>

      {/* Calendar card */}
      <View
        style={{
          marginTop: theme.spacing(4),
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.bento,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing(5),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(3) }}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={navBtn(theme)}>
            <Ionicons name="chevron-back" size={18} color={theme.colors.ink} />
          </Pressable>
          <Text variant="title" style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
            {first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={navBtn(theme)}>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.ink} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} variant="label" color={theme.colors.muted} style={{ flex: 1, textAlign: 'center' }}>
              {d}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {cells.map((day, i) => {
            if (day == null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
            const dayKey = dayKeyOf(new Date(year, month, day));
            const hasEvents = !!eventsByDay[day];
            const isToday = dayKey === todayKey;
            const isSelected = selected != null && dayKeyOf(new Date(selected)) === dayKey;
            const bg = isSelected ? theme.colors.ink : hasEvents ? palette.solid : 'transparent';
            const fg = isSelected ? theme.colors.bg : hasEvents ? palette.on : theme.colors.ink;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
                <Pressable
                  onPress={() => setSelected(new Date(year, month, day).getTime())}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bg,
                    borderWidth: isToday && !isSelected ? 2 : 0,
                    borderColor: theme.colors.ink,
                  }}
                >
                  <Text variant="label" color={fg}>
                    {day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {/* Selected day's events */}
      {selected != null ? (
        <View style={{ marginTop: theme.spacing(5) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="title" style={{ flex: 1, textTransform: 'capitalize' }}>
              {new Date(selected).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Pressable onPress={() => setEditing({ day: new Date(selected).getDate() })} style={pillBtn(theme, theme.colors.primary)}>
              <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
              <Text variant="label" color={theme.colors.onPrimary}>
                Événement
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
            {selectedEvents.length === 0 ? (
              <Text variant="caption" color={theme.colors.muted}>
                Rien de prévu ce jour. Ajoute un événement.
              </Text>
            ) : (
              selectedEvents.map((e) => {
                const p = e.payload as CalendarEventPayload;
                return (
                  <Pressable key={e.id} onPress={() => setEditing({ day: new Date(selected).getDate(), entry: e })} style={row(theme)}>
                    <View style={{ width: 4, height: 36, borderRadius: 999, backgroundColor: palette.solid }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="body">{e.title}</Text>
                      <Text variant="label" color={theme.colors.muted}>
                        {timeLabel(p.start)} – {timeLabel(p.end)}
                      </Text>
                    </View>
                    <Ionicons name="create-outline" size={18} color={theme.colors.muted} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      ) : null}

      {/* Habits */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Habitudes</Text>
        <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
          {habits.map((habit) => {
            const checked = checkedHabitIds.has(habit.id);
            const streak = (habit.payload as HabitPayload).streak ?? 0;
            const icon = (habit.payload as HabitPayload).icon as keyof typeof Ionicons.glyphMap;
            return (
              <Pressable key={habit.id} onPress={() => toggleHabit(habit)} style={[row(theme), checked ? { backgroundColor: theme.colors.primary } : null]}>
                <Ionicons name={icon ?? 'ellipse'} size={22} color={theme.colors.ink} />
                <Text variant="body" style={{ flex: 1 }}>
                  {habit.title}
                </Text>
                <Text variant="label" color={checked ? theme.colors.onPrimary : theme.colors.muted}>
                  🔥 {streak}
                </Text>
                <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={checked ? theme.colors.ink : theme.colors.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <EventModal editing={editing} year={year} month={month} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function EventModal({
  editing,
  year,
  month,
  onClose,
}: {
  editing: { day: number; entry?: Entry } | null;
  year: number;
  month: number;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.entry;
  const existingStart = existing ? (existing.payload as CalendarEventPayload).start : null;

  const [title, setTitle] = useState('');
  const [hour, setHour] = useState(9);

  React.useEffect(() => {
    if (visible) {
      setTitle(existing?.title ?? '');
      setHour(existingStart ? new Date(existingStart).getHours() : 9);
    }
  }, [visible, existing, existingStart]);

  const submit = async () => {
    if (!editing) return;
    const dayStart = new Date(year, month, editing.day).getTime();
    const start = dayStart + hour * 3_600_000;
    if (existing) await updateEvent(existing, { title: title.trim() || 'Événement', start });
    else await addEvent({ title: title.trim() || 'Événement', start });
    onClose();
  };

  const remove = async () => {
    if (existing) await deleteEvent(existing);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, padding: theme.spacing(6), gap: theme.spacing(3) }}
        >
          <Text variant="title">{existing ? 'Modifier l’événement' : 'Nouvel événement'}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor={theme.colors.muted}
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 15,
              color: theme.colors.ink,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          />
          <Text variant="label" color={theme.colors.inkSoft}>
            Heure
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[7, 8, 9, 10, 11, 12, 14, 16, 18, 20].map((h) => (
              <Pressable
                key={h}
                onPress={() => setHour(h)}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: theme.radius.md, backgroundColor: hour === h ? theme.colors.primary : theme.colors.surfaceAlt }}
              >
                <Text variant="label" color={hour === h ? theme.colors.onPrimary : theme.colors.ink}>
                  {h}h
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={submit} style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}>
            <Text variant="label" color={theme.colors.onPrimary}>
              {existing ? 'Enregistrer' : 'Ajouter'}
            </Text>
          </Pressable>
          {existing ? (
            <Pressable onPress={remove} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text variant="label" color={theme.colors.danger}>
                Supprimer
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const navBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 36,
  height: 36,
  borderRadius: t.radius.pill,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});
const pillBtn = (t: ReturnType<typeof useTheme>['theme'], bg: string) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: t.radius.pill,
  backgroundColor: bg,
});
const row = (t: ReturnType<typeof useTheme>['theme']) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  backgroundColor: t.colors.surface,
  borderRadius: t.radius.md,
  borderWidth: 1,
  borderColor: t.colors.border,
  padding: t.spacing(4),
});
