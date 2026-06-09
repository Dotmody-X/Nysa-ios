import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton, Field, PrimaryButton } from '@/components/ListUI';
import { DateTimeFields } from '@/components/DateTimePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntriesBetween } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type TimeBlockPayload, type ProjectPayload } from '@/poles/types';
import { formatClock, formatDuration } from '@/lib/time';
import { useTimer } from './timerStore';
import { finishSession } from './tracking';
import { EnergyModal } from './EnergyModal';
import { queryProjects, updateTimeBlock, deleteTimeBlock } from './work';

const DAY = 86_400_000;
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function TimeTrackerScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const projects = useObservedQuery<Entry>(() => queryProjects(), [], ['title', 'payload']);
  const blocks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.work, 'time_block', weekStart(), Date.now() + DAY),
    [],
    ['payload', 'title'],
  );

  const projById = useMemo(() => {
    const m: Record<string, Entry> = {};
    projects.forEach((p) => (m[p.id] = p));
    return m;
  }, [projects]);

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaySec = blocks
    .filter((b) => b.occurredAt.getTime() >= todayStart)
    .reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0);
  const weekSec = blocks.reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0);

  const [editing, setEditing] = useState<{ entry?: Entry } | null>(null);

  return (
    <Screen account={false}>
      <BackButton onPress={() => router.back()} />
      <Text variant="display">Time-tracker</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Aujourd'hui {formatDuration(todaySec)} · semaine {formatDuration(weekSec)}
      </Text>

      <TimerCard projects={projects} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing(7) }}>
        <Text variant="title" style={{ flex: 1 }}>
          Cette semaine
        </Text>
        <Pressable onPress={() => setEditing({})} hitSlop={8} style={addBtn(theme)}>
          <Ionicons name="add" size={18} color={theme.colors.ink} />
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
        {blocks.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucune session cette semaine.
          </Text>
        ) : (
          [...blocks]
            .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
            .map((b) => {
              const p = b.payload as TimeBlockPayload;
              const proj = p.projectId ? projById[p.projectId] : null;
              const color = proj ? (proj.payload as ProjectPayload).color ?? theme.colors.accent : theme.colors.muted;
              return (
                <Pressable key={b.id} onPress={() => setEditing({ entry: b })} style={row(theme)}>
                  <View style={{ width: 4, height: 38, borderRadius: 999, backgroundColor: color }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{b.title}</Text>
                    <Text variant="label" color={theme.colors.muted}>
                      {b.occurredAt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} ·{' '}
                      {proj?.title ?? 'Sans projet'}
                      {p.billable ? ' · facturable' : ''}
                    </Text>
                  </View>
                  <Text variant="label" color={theme.colors.ink}>
                    {formatDuration(p.durationSec ?? 0)}
                  </Text>
                </Pressable>
              );
            })
        )}
      </View>

      <EntryModal editing={editing} projects={projects} onClose={() => setEditing(null)} />
    </Screen>
  );
}

/** Live timer with project + description + billable. */
function TimerCard({ projects }: { projects: Entry[] }) {
  const { theme } = useTheme();
  const { running, startedAt, projectId, projectTitle, note, billable, start, setNote, setBillable, reset } = useTimer();
  const [elapsed, setElapsed] = useState(0);
  const [pendingEnd, setPendingEnd] = useState<number | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [offsetMin, setOffsetMin] = useState(0); // "j'ai commencé il y a X min"
  const [exact, setExact] = useState<Date | null>(null); // precise start time

  useEffect(() => {
    if (!running || !startedAt) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  const active = projects.filter((p) => (p.payload as ProjectPayload).status === 'active');
  const selectedProject = projects.find((p) => p.id === (running ? projectId : sel));

  const resolvedStart = exact ? exact.getTime() : Date.now() - offsetMin * 60_000;
  const onStart = () => {
    start({ projectId: selectedProject?.id, projectTitle: selectedProject?.title, billable, startedAt: resolvedStart });
    setOffsetMin(0);
    setExact(null);
  };
  const onStop = () => setPendingEnd(Date.now());
  const commit = async (energy?: { level: 1 | 2 | 3 | 4 | 5; focus: 1 | 2 | 3 | 4 | 5 }) => {
    if (!startedAt || !pendingEnd) return;
    await finishSession({
      startedAt,
      endedAt: pendingEnd,
      projectId,
      projectTitle,
      note,
      billable,
      energy,
      source: 'tracker',
    });
    setPendingEnd(null);
    reset();
  };

  return (
    <>
      <View style={{ marginTop: theme.spacing(4), backgroundColor: running ? theme.colors.accent : theme.colors.surface, borderRadius: theme.radius.bento, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(5), gap: theme.spacing(3) }}>
        <Text variant="label" color={running ? theme.colors.onAccent : theme.colors.inkSoft}>
          {running ? `En cours · ${projectTitle ?? 'Sans projet'}` : 'Prêt à démarrer'}
        </Text>
        <Text variant="stat" color={running ? theme.colors.onAccent : theme.colors.ink} style={{ fontSize: 48, lineHeight: 52 }}>
          {formatClock(running ? elapsed : 0)}
        </Text>

        {!running ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <ProjChip label="Sans projet" active={sel == null} color={theme.colors.muted} onPress={() => setSel(null)} />
              {active.map((p) => (
                <ProjChip
                  key={p.id}
                  label={p.title}
                  active={sel === p.id}
                  color={(p.payload as ProjectPayload).color ?? theme.colors.accent}
                  onPress={() => setSel(p.id)}
                />
              ))}
            </View>
            <Field value={note ?? ''} onChangeText={setNote} placeholder="Sur quoi travailles-tu ?" />
            <Pressable onPress={() => setBillable(!billable)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={billable ? 'checkbox' : 'square-outline'} size={22} color={billable ? theme.colors.primary : theme.colors.muted} />
              <Text variant="label">Facturable</Text>
            </Pressable>

            {/* Start time — backdate if you forgot to press start */}
            <Text variant="label" color={theme.colors.inkSoft}>
              Commencé · {new Date(resolvedStart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { m: 0, l: 'Maintenant' },
                { m: 5, l: '-5 min' },
                { m: 15, l: '-15 min' },
                { m: 30, l: '-30 min' },
                { m: 60, l: '-1 h' },
              ].map(({ m, l }) => {
                const active = exact == null && offsetMin === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setExact(null);
                      setOffsetMin(m);
                    }}
                    style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
                  >
                    <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                      {l}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setExact(exact ? null : new Date())}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: exact ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Ionicons name="time-outline" size={14} color={exact ? theme.colors.bg : theme.colors.ink} />
                <Text variant="label" color={exact ? theme.colors.bg : theme.colors.ink}>
                  Heure
                </Text>
              </Pressable>
            </View>
            {exact ? <DateTimeFields value={exact} onChange={setExact} withDate={false} /> : null}
          </>
        ) : null}

        <Pressable
          onPress={() => (running ? onStop() : onStart())}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: theme.radius.pill, backgroundColor: running ? theme.colors.bg : theme.colors.primary }}
        >
          <Ionicons name={running ? 'stop' : 'play'} size={18} color={theme.colors.ink} />
          <Text variant="label" color={theme.colors.ink}>
            {running ? 'Arrêter' : 'Démarrer'}
          </Text>
        </Pressable>
      </View>

      <EnergyModal
        visible={pendingEnd !== null}
        durationLabel={formatDuration(startedAt && pendingEnd ? Math.round((pendingEnd - startedAt) / 1000) : 0)}
        onCancel={() => commit(undefined)}
        onSubmit={(energy) => commit(energy)}
      />
    </>
  );
}

function ProjChip({ label, active, color, onPress }: { label: string; active: boolean; color: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
      <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Manual create / edit of a time entry. */
function EntryModal({ editing, projects, onClose }: { editing: { entry?: Entry } | null; projects: Entry[]; onClose: () => void }) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.entry;

  const [note, setNote] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [billable, setBillable] = useState(false);
  const [startD, setStartD] = useState(() => new Date());
  const [endD, setEndD] = useState(() => new Date());

  useEffect(() => {
    if (!visible) return;
    const p = existing?.payload as TimeBlockPayload | undefined;
    const s = new Date(p?.startedAt ?? existing?.occurredAt.getTime() ?? Date.now() - 3_600_000);
    const e = new Date(p?.endedAt ?? (p?.startedAt ?? Date.now()) + (p?.durationSec ?? 3600) * 1000);
    setNote(existing?.title ?? '');
    setProjectId(p?.projectId ?? null);
    setBillable(!!p?.billable);
    setStartD(s);
    setEndD(e);
  }, [visible, existing]);

  const composedEnd = useMemo(() => {
    const e = new Date(startD);
    e.setHours(endD.getHours(), endD.getMinutes(), 0, 0);
    if (e.getTime() <= startD.getTime()) e.setTime(startD.getTime() + 30 * 60_000);
    return e;
  }, [startD, endD]);

  const submit = async () => {
    if (existing) {
      await updateTimeBlock(existing, {
        note,
        projectId: projectId ?? undefined,
        billable,
        startedAt: startD.getTime(),
        endedAt: composedEnd.getTime(),
      });
    } else {
      const proj = projects.find((p) => p.id === projectId);
      await finishSession({
        startedAt: startD.getTime(),
        endedAt: composedEnd.getTime(),
        projectId: projectId ?? undefined,
        projectTitle: proj?.title,
        note,
        billable,
        source: 'manual',
      });
    }
    onClose();
  };
  const remove = async () => {
    if (existing) await deleteTimeBlock(existing);
    onClose();
  };

  const active = projects.filter((p) => (p.payload as ProjectPayload).status === 'active');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, maxHeight: '88%' }}>
          <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: theme.spacing(6), gap: theme.spacing(3) }}>
            <Text variant="title">{existing ? 'Modifier la session' : 'Saisie manuelle'}</Text>
            <Field value={note} onChangeText={setNote} placeholder="Description" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <ProjChip label="Sans projet" active={projectId == null} color={theme.colors.muted} onPress={() => setProjectId(null)} />
              {active.map((p) => (
                <ProjChip key={p.id} label={p.title} active={projectId === p.id} color={(p.payload as ProjectPayload).color ?? theme.colors.accent} onPress={() => setProjectId(p.id)} />
              ))}
            </View>
            <Pressable onPress={() => setBillable(!billable)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={billable ? 'checkbox' : 'square-outline'} size={22} color={billable ? theme.colors.primary : theme.colors.muted} />
              <Text variant="label">Facturable</Text>
            </Pressable>
            <Text variant="label" color={theme.colors.inkSoft}>
              Début
            </Text>
            <DateTimeFields value={startD} onChange={setStartD} withDate collapsible />
            <Text variant="label" color={theme.colors.inkSoft}>
              Fin (heure)
            </Text>
            <DateTimeFields value={endD} onChange={setEndD} withDate={false} collapsible />
            <PrimaryButton label={existing ? 'Enregistrer' : 'Ajouter'} onPress={submit} />
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

const addBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 36,
  height: 36,
  borderRadius: t.radius.pill,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
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
