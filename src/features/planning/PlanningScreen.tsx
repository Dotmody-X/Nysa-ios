import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import {
  queryEntries,
  queryEntriesBetween,
  createEntry,
  patchPayload,
  renameEntry,
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
import { DateTimeFields } from '@/components/DateTimePicker';
import { addEvent, deleteEvent, updateEvent } from './planning';
import { EVENT_CATEGORIES, DEFAULT_CATEGORY, categoryColor } from './categories';

type CalView = 'day' | 'week' | 'month';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY = 86_400_000;
const HOUR_H = 56;
const GUTTER = 44;

/** Daily routine groupings for the habits checklist. */
const ROUTINE_GROUPS: { key: 'morning' | 'evening' | 'other'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'morning', label: 'Routine du matin', icon: 'sunny' },
  { key: 'evening', label: 'Routine du soir', icon: 'moon' },
  { key: 'other', label: 'Autres habitudes', icon: 'repeat' },
];

const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const startOfDayMs = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const addDaysMs = (ms: number, n: number) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
const mondayOf = (ms: number) => {
  const d = new Date(ms);
  const dow = (d.getDay() + 6) % 7;
  return startOfDayMs(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow));
};
/** Pick readable text color over a category fill. */
const textOn = (hex: string) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.6 ? '#1A0708' : '#FFFFFF';
};

export function PlanningScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.planning;

  const [view, setView] = useState<CalView>('month');
  const [anchor, setAnchor] = useState<number>(startOfDayMs(new Date()));

  // Visible period range (for the events query).
  const period = useMemo(() => {
    if (view === 'day') return { start: anchor, end: anchor + DAY, days: [anchor] };
    if (view === 'week') {
      const ws = mondayOf(anchor);
      return { start: ws, end: ws + 7 * DAY, days: Array.from({ length: 7 }, (_, i) => ws + i * DAY) };
    }
    const d = new Date(anchor);
    const ms = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    return { start: ms, end: me, days: [] as number[] };
  }, [view, anchor]);

  const events = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'calendar_event', period.start, period.end),
    [period.start, period.end],
    ['payload', 'title'],
  );
  const habits = useObservedQuery<Entry>(() => queryEntries(POLE.planning, 'habit'), [], ['title', 'payload']);
  const checks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.planning, 'habit_check', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );

  const timed = useMemo(() => events.filter((e) => !(e.payload as CalendarEventPayload).allDay), [events]);
  const allDay = useMemo(() => events.filter((e) => (e.payload as CalendarEventPayload).allDay), [events]);

  // Hour window: default 6h–22h, widened to fit out-of-range events.
  const win = useMemo(() => {
    let min = 6;
    let max = 22;
    for (const e of timed) {
      const p = e.payload as CalendarEventPayload;
      const s = new Date(p.start);
      const en = new Date(p.end);
      if (s.getTime() >= period.start && s.getTime() < period.end) min = Math.min(min, s.getHours());
      max = Math.max(max, en.getHours() + (en.getMinutes() > 0 ? 1 : 0));
    }
    return { start: Math.max(0, Math.min(min, 23)), end: Math.min(24, Math.max(max, min + 2)) };
  }, [timed, period.start, period.end]);

  const shift = (delta: number) => {
    if (view === 'day') setAnchor((a) => addDaysMs(a, delta));
    else if (view === 'week') setAnchor((a) => addDaysMs(a, delta * 7));
    else {
      const d = new Date(anchor);
      setAnchor(new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime());
    }
  };
  const goToday = () => setAnchor(startOfDayMs(new Date()));

  const periodTitle = useMemo(() => {
    const d = new Date(anchor);
    if (view === 'day') return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (view === 'week') {
      const ws = mondayOf(anchor);
      const we = ws + 6 * DAY;
      const a = new Date(ws);
      const b = new Date(we);
      return `${a.getDate()} – ${b.getDate()} ${b.toLocaleDateString('fr-FR', { month: 'short' })}`;
    }
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [view, anchor]);

  const [editing, setEditing] = useState<{ start: number; entry?: Entry } | null>(null);
  const openNew = (startMs: number) => setEditing({ start: startMs });

  // Month: tapping a day opens a preview of that day's events; empty → straight to add.
  const [dayPreview, setDayPreview] = useState<number | null>(null);
  const pickDay = (ms: number) => {
    const dayEvents = events.filter((e) => {
      const s = (e.payload as CalendarEventPayload).start;
      return s >= ms && s < ms + DAY;
    });
    if (dayEvents.length === 0) openNew(ms + 9 * 3_600_000);
    else setDayPreview(ms);
  };
  const previewEvents = useMemo(() => {
    if (dayPreview == null) return [];
    return events
      .filter((e) => {
        const s = (e.payload as CalendarEventPayload).start;
        return s >= dayPreview && s < dayPreview + DAY;
      })
      .sort((a, b) => (a.payload as CalendarEventPayload).start - (b.payload as CalendarEventPayload).start);
  }, [events, dayPreview]);

  // Habit add/edit.
  const [habitEdit, setHabitEdit] = useState<{ entry?: Entry } | null>(null);

  // ---- Habits ----
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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Planning</Text>
          <Text variant="body" color={theme.colors.inkSoft}>
            Ton calendrier, ton temps.
          </Text>
        </View>
        <Pressable onPress={() => router.push('/reminders')} style={pillBtn(theme, theme.colors.surface, true)}>
          <Ionicons name="alarm" size={16} color={palette.solid} />
          <Text variant="label">Rappels</Text>
        </Pressable>
      </View>

      {/* View switcher */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(4) }}>
        {(['month', 'week', 'day'] as CalView[]).map((v) => {
          const active = v === view;
          const label = v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois';
          return (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: theme.radius.pill,
                alignItems: 'center',
                backgroundColor: active ? theme.colors.ink : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Period nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing(4) }}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} style={navBtn(theme)}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.ink} />
        </Pressable>
        <Pressable onPress={goToday} style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="title" style={{ textTransform: 'capitalize', textAlign: 'center' }}>
            {periodTitle}
          </Text>
          <Text variant="label" color={theme.colors.muted}>
            Aujourd’hui
          </Text>
        </Pressable>
        <Pressable onPress={() => shift(1)} hitSlop={10} style={navBtn(theme)}>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.ink} />
        </Pressable>
      </View>

      {view === 'month' ? (
        <MonthView anchor={anchor} events={events} onSelectDay={pickDay} />
      ) : (
        <TimeGridView
          days={period.days}
          win={win}
          timed={timed}
          allDay={allDay}
          isWeek={view === 'week'}
          onOpenDay={(ms) => {
            setAnchor(ms);
            setView('day');
          }}
          onPressEvent={(e) => setEditing({ start: (e.payload as CalendarEventPayload).start, entry: e })}
          onPressSlot={(ms) => openNew(ms)}
        />
      )}

      {/* Add event FAB-style button */}
      <Pressable
        onPress={() => {
          const base = new Date(view === 'day' ? anchor : startOfDayMs(new Date()));
          base.setHours(Math.max(win.start, 9), 0, 0, 0);
          openNew(base.getTime());
        }}
        style={{
          marginTop: theme.spacing(4),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
        }}
      >
        <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
        <Text variant="label" color={theme.colors.onPrimary}>
          Nouvel événement
        </Text>
      </Pressable>

      {/* Habits & routines */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="title" style={{ flex: 1 }}>
            Routines & habitudes
          </Text>
          <Pressable onPress={() => setHabitEdit({})} hitSlop={10} style={navBtn(theme)}>
            <Ionicons name="add" size={20} color={theme.colors.ink} />
          </Pressable>
        </View>
        <Text variant="caption" color={theme.colors.muted} style={{ marginTop: 4 }}>
          Appui long pour modifier ou supprimer.
        </Text>

        {ROUTINE_GROUPS.map((g) => {
          const list = habits.filter((h) => ((h.payload as HabitPayload).routine ?? 'other') === g.key);
          if (list.length === 0) return null;
          const done = list.filter((h) => checkedHabitIds.has(h.id)).length;
          return (
            <View key={g.key} style={{ marginTop: theme.spacing(5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing(2) }}>
                <Ionicons name={g.icon} size={16} color={palette.solid} />
                <Text variant="label" color={theme.colors.inkSoft} style={{ flex: 1 }}>
                  {g.label}
                </Text>
                <Text variant="label" color={theme.colors.muted}>
                  {done}/{list.length}
                </Text>
              </View>
              <View style={{ gap: 10 }}>
                {list.map((habit) => {
                  const checked = checkedHabitIds.has(habit.id);
                  const streak = (habit.payload as HabitPayload).streak ?? 0;
                  const icon = (habit.payload as HabitPayload).icon as keyof typeof Ionicons.glyphMap;
                  return (
                    <Pressable
                      key={habit.id}
                      onPress={() => toggleHabit(habit)}
                      onLongPress={() => setHabitEdit({ entry: habit })}
                      style={[row(theme), checked ? { backgroundColor: theme.colors.primary } : null]}
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
          );
        })}

        {habits.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted} style={{ marginTop: theme.spacing(3) }}>
            Aucune habitude. Ajoute-en une avec le +, et range-la dans ta routine du matin ou du soir.
          </Text>
        ) : null}
      </View>

      <EventModal editing={editing} onClose={() => setEditing(null)} />
      <DayEventsSheet
        dayMs={dayPreview}
        events={previewEvents}
        onClose={() => setDayPreview(null)}
        onPressEvent={(e) => {
          setDayPreview(null);
          setEditing({ start: (e.payload as CalendarEventPayload).start, entry: e });
        }}
        onAdd={() => {
          const ms = (dayPreview ?? startOfDayMs(new Date())) + 9 * 3_600_000;
          setDayPreview(null);
          openNew(ms);
        }}
      />
      <HabitModal habitEdit={habitEdit} onClose={() => setHabitEdit(null)} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Day events preview (month tap)
// ---------------------------------------------------------------------------
function DayEventsSheet({
  dayMs,
  events,
  onClose,
  onPressEvent,
  onAdd,
}: {
  dayMs: number | null;
  events: Entry[];
  onClose: () => void;
  onPressEvent: (e: Entry) => void;
  onAdd: () => void;
}) {
  const { theme } = useTheme();
  const visible = dayMs != null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            padding: theme.spacing(6),
            gap: theme.spacing(3),
            maxHeight: '80%',
          }}
        >
          <Text variant="title" style={{ textTransform: 'capitalize' }}>
            {dayMs != null
              ? new Date(dayMs).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
              : ''}
          </Text>
          <ScrollView contentContainerStyle={{ gap: 10 }}>
            {events.map((e) => {
              const p = e.payload as CalendarEventPayload;
              const c = categoryColor(p.category);
              return (
                <Pressable key={e.id} onPress={() => onPressEvent(e)} style={row(theme)}>
                  <View style={{ width: 4, height: 36, borderRadius: 999, backgroundColor: c }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{e.title}</Text>
                    <Text variant="label" color={theme.colors.muted}>
                      {p.allDay ? 'Toute la journée' : `${timeLabel(p.start)} – ${timeLabel(p.end)}`}
                      {p.location ? ` · ${p.location}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="create-outline" size={18} color={theme.colors.muted} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={onAdd}
            style={{ paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}
          >
            <Text variant="label" color={theme.colors.onPrimary}>
              + Ajouter un événement
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Habit add / edit
// ---------------------------------------------------------------------------
const HABIT_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'leaf', 'book', 'barbell', 'water', 'walk', 'bed', 'sunny', 'heart', 'musical-notes', 'brush', 'cafe', 'bicycle',
];

function HabitModal({
  habitEdit,
  onClose,
}: {
  habitEdit: { entry?: Entry } | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const visible = habitEdit !== null;
  const existing = habitEdit?.entry;

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>('leaf');
  const [routine, setRoutine] = useState<'morning' | 'evening' | undefined>(undefined);

  React.useEffect(() => {
    if (!visible) return;
    const p = existing?.payload as HabitPayload | undefined;
    setTitle(existing?.title ?? '');
    setIcon((p?.icon as keyof typeof Ionicons.glyphMap) ?? 'leaf');
    setRoutine(p?.routine);
  }, [visible, existing]);

  const save = async () => {
    const name = title.trim() || 'Habitude';
    if (existing) {
      await renameEntry(existing, name);
      await patchPayload<'habit'>(existing, { icon, routine });
    } else {
      await createEntry({
        poleId: POLE.planning,
        type: 'habit',
        title: name,
        payload: { schedule: 'daily', streak: 0, icon, routine },
      });
    }
    onClose();
  };
  const remove = async () => {
    if (existing) {
      // Clean up the habit's checks too, so the home counter doesn't keep them.
      const allChecks = await queryEntries(POLE.planning, 'habit_check').fetch();
      for (const c of allChecks) {
        if ((c.payload as HabitCheckPayload).habitId === existing.id) await softDeleteEntry(c);
      }
      await softDeleteEntry(existing);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            padding: theme.spacing(6),
            gap: theme.spacing(3),
          }}
        >
          <Text variant="title">{existing ? 'Modifier l’habitude' : 'Nouvelle habitude'}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Nom"
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {HABIT_ICONS.map((ic) => {
              const active = ic === icon;
              return (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: theme.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                  }}
                >
                  <Ionicons name={ic} size={22} color={active ? theme.colors.onPrimary : theme.colors.ink} />
                </Pressable>
              );
            })}
          </View>

          <Text variant="label" color={theme.colors.inkSoft}>
            Routine
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { key: undefined, label: 'Aucune', icon: 'repeat' as const },
              { key: 'morning' as const, label: 'Matin', icon: 'sunny' as const },
              { key: 'evening' as const, label: 'Soir', icon: 'moon' as const },
            ]).map((opt) => {
              const active = routine === opt.key;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setRoutine(opt.key)}
                  style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
                >
                  <Ionicons name={opt.icon} size={14} color={active ? theme.colors.bg : theme.colors.muted} />
                  <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={save}
            style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}
          >
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
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------
function MonthView({
  anchor,
  events,
  onSelectDay,
}: {
  anchor: number;
  events: Entry[];
  onSelectDay: (ms: number) => void;
}) {
  const { theme } = useTheme();
  const palette = theme.poleColors.planning;
  const d = new Date(anchor);
  const year = d.getFullYear();
  const month = d.getMonth();

  const byDay = useMemo(() => {
    const m: Record<number, Entry[]> = {};
    for (const e of events) {
      const day = new Date((e.payload as CalendarEventPayload).start).getDate();
      (m[day] ??= []).push(e);
    }
    return m;
  }, [events]);

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = startOfDayMs(new Date());

  return (
    <View style={card(theme)}>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} variant="label" color={theme.colors.muted} style={{ flex: 1, textAlign: 'center' }}>
            {w}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {cells.map((day, i) => {
          if (day == null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const dayMs = new Date(year, month, day).getTime();
          const dayEvents = byDay[day] ?? [];
          const isToday = dayMs === todayKey;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <Pressable
                onPress={() => onSelectDay(dayMs)}
                style={{
                  flex: 1,
                  borderRadius: theme.radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  backgroundColor: isToday ? theme.colors.ink : 'transparent',
                }}
              >
                <Text variant="label" color={isToday ? theme.colors.bg : theme.colors.ink}>
                  {day}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2, height: 5 }}>
                  {dayEvents.slice(0, 3).map((e) => (
                    <View
                      key={e.id}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: categoryColor((e.payload as CalendarEventPayload).category),
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Time grid (day & week)
// ---------------------------------------------------------------------------
function TimeGridView({
  days,
  win,
  timed,
  allDay,
  isWeek,
  onOpenDay,
  onPressEvent,
  onPressSlot,
}: {
  days: number[];
  win: { start: number; end: number };
  timed: Entry[];
  allDay: Entry[];
  isWeek: boolean;
  onOpenDay: (ms: number) => void;
  onPressEvent: (e: Entry) => void;
  onPressSlot: (ms: number) => void;
}) {
  const { theme } = useTheme();
  const gridH = (win.end - win.start) * HOUR_H;
  const hours = Array.from({ length: win.end - win.start + 1 }, (_, i) => win.start + i);
  const todayMs = startOfDayMs(new Date());
  const now = Date.now();
  const nowTop = (((now - todayMs) / 3_600_000) - win.start) * HOUR_H;
  const showNow = days.includes(todayMs) && nowTop >= 0 && nowTop <= gridH;

  return (
    <View style={[card(theme), { marginTop: theme.spacing(4) }]}>
      {/* Day headers (week only) */}
      {isWeek ? (
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ width: GUTTER }} />
          {days.map((ms) => {
            const dd = new Date(ms);
            const isToday = ms === todayMs;
            return (
              <Pressable key={ms} onPress={() => onOpenDay(ms)} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="label" color={theme.colors.muted}>
                  {WEEKDAYS[(dd.getDay() + 6) % 7]}
                </Text>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? theme.colors.ink : 'transparent',
                  }}
                >
                  <Text variant="label" color={isToday ? theme.colors.bg : theme.colors.ink}>
                    {dd.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* All-day band */}
      {allDay.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {allDay.map((e) => {
            const c = categoryColor((e.payload as CalendarEventPayload).category);
            return (
              <Pressable
                key={e.id}
                onPress={() => onPressEvent(e)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: theme.radius.pill, backgroundColor: c }}
              >
                <Ionicons name="sunny" size={12} color={textOn(c)} />
                <Text variant="label" color={textOn(c)}>
                  {e.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Hour grid */}
      <View style={{ height: gridH }}>
        {/* hour lines + labels */}
        {hours.map((h) => (
          <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: (h - win.start) * HOUR_H, flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text variant="label" color={theme.colors.muted} style={{ width: GUTTER, fontSize: 10, marginTop: -6 }}>
              {String(h).padStart(2, '0')}h
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border, marginTop: -1 }} />
          </View>
        ))}

        {/* current-time line */}
        {showNow ? (
          <View style={{ position: 'absolute', left: GUTTER, right: 0, top: nowTop, height: 2, backgroundColor: theme.colors.secondary }} />
        ) : null}

        {/* columns */}
        <View style={{ position: 'absolute', left: GUTTER, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {days.map((dayMs) => (
            <DayColumn
              key={dayMs}
              dayMs={dayMs}
              win={win}
              timed={timed}
              onPressEvent={onPressEvent}
              onPressSlot={onPressSlot}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function DayColumn({
  dayMs,
  win,
  timed,
  onPressEvent,
  onPressSlot,
}: {
  dayMs: number;
  win: { start: number; end: number };
  timed: Entry[];
  onPressEvent: (e: Entry) => void;
  onPressSlot: (ms: number) => void;
}) {
  const { theme } = useTheme();
  const dayEnd = dayMs + DAY;
  const dayEvents = timed.filter((e) => {
    const p = e.payload as CalendarEventPayload;
    return p.start < dayEnd && p.end > dayMs;
  });

  return (
    <View style={{ flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.border }}>
      {/* tap empty slot → create at that hour */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(evt) => {
          const hour = win.start + Math.floor(evt.nativeEvent.locationY / HOUR_H);
          onPressSlot(dayMs + hour * 3_600_000);
        }}
      />
      {dayEvents.map((e) => {
        const p = e.payload as CalendarEventPayload;
        const s = Math.max(p.start, dayMs);
        const en = Math.min(p.end, dayEnd);
        const sH = (s - dayMs) / 3_600_000;
        const eH = (en - dayMs) / 3_600_000;
        const top = (sH - win.start) * HOUR_H;
        const height = Math.max((eH - sH) * HOUR_H - 2, 22);
        const c = categoryColor(p.category);
        const fg = textOn(c);
        return (
          <Pressable
            key={e.id}
            onPress={() => onPressEvent(e)}
            style={{
              position: 'absolute',
              left: 2,
              right: 2,
              top,
              height,
              borderRadius: 8,
              backgroundColor: c,
              paddingHorizontal: 5,
              paddingVertical: 2,
              overflow: 'hidden',
            }}
          >
            <Text variant="label" color={fg} numberOfLines={1} style={{ fontSize: 11 }}>
              {e.title}
            </Text>
            {height > 30 ? (
              <Text variant="label" color={fg} numberOfLines={1} style={{ fontSize: 9, opacity: 0.85 }}>
                {timeLabel(p.start)}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Event modal (rich)
// ---------------------------------------------------------------------------
function EventModal({
  editing,
  onClose,
}: {
  editing: { start: number; entry?: Entry } | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.entry;

  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date());
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (!visible || !editing) return;
    const p = existing?.payload as CalendarEventPayload | undefined;
    const s = new Date(p?.start ?? editing.start);
    const e = new Date(p?.end ?? editing.start + 60 * 60_000);
    setTitle(existing?.title ?? '');
    setStart(s);
    setEnd(e);
    setAllDay(!!p?.allDay);
    setCategory(p?.category ?? DEFAULT_CATEGORY);
    setLocation(p?.location ?? '');
    setNotes(p?.notes ?? '');
  }, [visible, editing, existing]);

  // Keep end on the same day as start, after start.
  const composedEnd = useMemo(() => {
    const e = new Date(start);
    e.setHours(end.getHours(), end.getMinutes(), 0, 0);
    if (e.getTime() <= start.getTime()) e.setTime(start.getTime() + 30 * 60_000);
    return e;
  }, [start, end]);

  const submit = async () => {
    const args = {
      title: title.trim() || 'Événement',
      start: start.getTime(),
      end: composedEnd.getTime(),
      allDay,
      category,
      location,
      notes,
    };
    if (existing) await updateEvent(existing, args);
    else await addEvent(args);
    onClose();
  };
  const remove = async () => {
    if (existing) await deleteEvent(existing);
    onClose();
  };

  const inputStyle = {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            maxHeight: '88%',
          }}
        >
          <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: theme.spacing(6), gap: theme.spacing(3) }}>
            <Text variant="title">{existing ? 'Modifier l’événement' : 'Nouvel événement'}</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre"
              placeholderTextColor={theme.colors.muted}
              style={inputStyle}
            />

            {/* Category chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EVENT_CATEGORIES.map((cat) => {
                const active = cat.key === category;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: theme.radius.pill,
                      backgroundColor: active ? cat.color : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: active ? cat.color : theme.colors.border,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: active ? textOn(cat.color) : cat.color }} />
                    <Text variant="label" color={active ? textOn(cat.color) : theme.colors.ink}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* All-day toggle */}
            <Pressable onPress={() => setAllDay((v) => !v)} style={[row(theme), { justifyContent: 'space-between' }]}>
              <Text variant="body">Toute la journée</Text>
              <View
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 999,
                  backgroundColor: allDay ? theme.colors.primary : theme.colors.surfaceAlt,
                  padding: 3,
                  justifyContent: 'center',
                  alignItems: allDay ? 'flex-end' : 'flex-start',
                }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: theme.colors.surface }} />
              </View>
            </Pressable>

            <Text variant="label" color={theme.colors.inkSoft}>
              Début
            </Text>
            <DateTimeFields value={start} onChange={setStart} withDate collapsible />

            {!allDay ? (
              <>
                <Text variant="label" color={theme.colors.inkSoft}>
                  Fin (heure)
                </Text>
                <DateTimeFields value={end} onChange={setEnd} withDate={false} collapsible />
              </>
            ) : null}

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Lieu (optionnel)"
              placeholderTextColor={theme.colors.muted}
              style={inputStyle}
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optionnel)"
              placeholderTextColor={theme.colors.muted}
              multiline
              style={[inputStyle, { minHeight: 64, textAlignVertical: 'top' }]}
            />

            <Pressable
              onPress={submit}
              style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}
            >
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const card = (t: ReturnType<typeof useTheme>['theme']) => ({
  marginTop: t.spacing(4),
  backgroundColor: t.colors.surface,
  borderRadius: t.radius.bento,
  borderWidth: 1,
  borderColor: t.colors.border,
  padding: t.spacing(5),
});
const navBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 36,
  height: 36,
  borderRadius: t.radius.pill,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});
const pillBtn = (t: ReturnType<typeof useTheme>['theme'], bg: string, bordered = false) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: t.radius.pill,
  backgroundColor: bg,
  borderWidth: bordered ? 1 : 0,
  borderColor: t.colors.border,
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
