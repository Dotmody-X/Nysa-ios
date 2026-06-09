import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntriesBetween } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type TimeBlockPayload, type TaskPayload, type EnergyPayload, type ProjectPayload } from '@/poles/types';
import { formatDuration } from '@/lib/time';
import { queryProjects, queryTasks } from './work';

type Period = 'week' | 'month';

function rangeOf(period: Period): { start: number; label: string } {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return { start: d.getTime(), label: 'cette semaine' };
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: d.getTime(), label: 'ce mois' };
}

export function ReviewScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');
  const { start, label } = rangeOf(period);
  const end = Date.now() + 86_400_000;

  const blocks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.work, 'time_block', start, end),
    [start],
    ['payload'],
  );
  const energy = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.work, 'energy', start, end),
    [start],
    ['payload'],
  );
  const tasks = useObservedQuery<Entry>(() => queryTasks(), [], ['payload']);
  const projects = useObservedQuery<Entry>(() => queryProjects(), [], ['title', 'payload']);

  const projName = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach((p) => (m[p.id] = p.title));
    return m;
  }, [projects]);

  const stats = useMemo(() => {
    const totalSec = blocks.reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0);
    const billableSec = blocks
      .filter((b) => (b.payload as TimeBlockPayload).billable)
      .reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0);
    const tasksDone = tasks.filter((t) => {
      const p = t.payload as TaskPayload;
      return p.done && p.completedAt != null && p.completedAt >= start && p.completedAt < end;
    }).length;
    const avgEnergy = energy.length ? energy.reduce((s, e) => s + (e.payload as EnergyPayload).level, 0) / energy.length : 0;
    const avgFocus = energy.length ? energy.reduce((s, e) => s + (e.payload as EnergyPayload).focus, 0) / energy.length : 0;

    const byProject: Record<string, number> = {};
    blocks.forEach((b) => {
      const p = b.payload as TimeBlockPayload;
      const key = p.projectId ?? '__none__';
      byProject[key] = (byProject[key] ?? 0) + (p.durationSec ?? 0);
    });
    const perProject = Object.entries(byProject)
      .map(([k, sec]) => ({ name: k === '__none__' ? 'Sans projet' : projName[k] ?? 'Projet', sec }))
      .sort((a, b) => b.sec - a.sec);

    return { totalSec, billableSec, sessions: blocks.length, tasksDone, avgEnergy, avgFocus, perProject };
  }, [blocks, energy, tasks, projName, start, end]);

  const maxSec = stats.perProject[0]?.sec ?? 1;

  return (
    <Screen account={false}>
      <BackButton onPress={() => router.back()} />
      <Text variant="display">Revue</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Ton bilan {label}.
      </Text>

      {/* Period toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(4) }}>
        {(['week', 'month'] as Period[]).map((pr) => {
          const active = pr === period;
          return (
            <Pressable
              key={pr}
              onPress={() => setPeriod(pr)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
            >
              <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                {pr === 'week' ? 'Semaine' : 'Mois'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: theme.spacing(5) }}>
        <Tile label="Focus total" value={formatDuration(stats.totalSec)} />
        <Tile label="Sessions" value={String(stats.sessions)} />
        <Tile label="Facturable" value={formatDuration(stats.billableSec)} />
        <Tile label="Tâches faites" value={String(stats.tasksDone)} />
        <Tile label="Énergie moy." value={stats.avgEnergy ? `${stats.avgEnergy.toFixed(1)}/5` : '—'} />
        <Tile label="Focus moy." value={stats.avgFocus ? `${stats.avgFocus.toFixed(1)}/5` : '—'} />
      </View>

      {/* Time per project */}
      <Text variant="title" style={{ marginTop: theme.spacing(7), marginBottom: theme.spacing(3) }}>
        Temps par projet
      </Text>
      {stats.perProject.length === 0 ? (
        <Text variant="caption" color={theme.colors.muted}>
          Aucune session sur la période.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {stats.perProject.map((row) => (
            <View key={row.name}>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text variant="label" style={{ flex: 1 }}>
                  {row.name}
                </Text>
                <Text variant="label" color={theme.colors.muted}>
                  {formatDuration(row.sec)}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
                <View style={{ width: `${(row.sec / maxSec) * 100}%`, height: 8, backgroundColor: theme.colors.primary }} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ width: '47%', flexGrow: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(4) }}>
      <Text variant="label" color={theme.colors.muted}>
        {label}
      </Text>
      <Text variant="stat" style={{ fontFamily: theme.fonts.accent, fontSize: 22, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
