import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { BentoGrid } from '@/components/BentoGrid';
import { StackedCard } from '@/components/StackedCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntriesBetween } from '@/db/repositories/entries';
import { queryGoalByMetric } from '@/db/repositories/goals';
import type { Entry } from '@/db/models/Entry';
import type { Goal } from '@/db/models/Goal';
import { POLE, METRIC, type TimeBlockPayload, type TaskPayload, type ProjectPayload } from '@/poles/types';
import { startOfDay, endOfDay, formatDuration, formatClock } from '@/lib/time';
import { useTimer } from './timerStore';
import { queryProjects, queryTasks } from './work';

function weekStartMs(): number {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function WorkScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.work;

  const projects = useObservedQuery<Entry>(() => queryProjects(), [], ['title', 'payload']);
  const tasks = useObservedQuery<Entry>(() => queryTasks(), [], ['title', 'payload']);
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
  const focusGoals = useObservedQuery<Goal>(() => queryGoalByMetric(METRIC.focusHours), [], ['current_value', 'target_value']);

  const todaySec = useMemo(
    () => todayBlocks.reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0),
    [todayBlocks],
  );
  const weekSec = useMemo(
    () => weekBlocks.reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0),
    [weekBlocks],
  );
  const activeProjects = useMemo(
    () => projects.filter((p) => (p.payload as ProjectPayload).status === 'active').length,
    [projects],
  );
  const openTasks = useMemo(() => tasks.filter((t) => !(t.payload as TaskPayload).done), [tasks]);
  const tasksDone = tasks.length - openTasks.length;
  const lateTasks = useMemo(() => {
    const now = Date.now();
    return openTasks.filter((t) => {
      const due = (t.payload as TaskPayload).due;
      return due != null && due < startOfDay() ? true : false;
    }).length;
  }, [openTasks]);

  // Week focus = actual logged time this week (auto-resets weekly), not the
  // cumulative goal counter.
  const weekH = weekSec / 3600;
  const targetH = focusGoals[0]?.targetValue ?? 20;
  const pct = targetH > 0 ? Math.min(1, weekH / targetH) : 0;

  return (
    <Screen>
      <Text variant="display">Travail</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        {formatDuration(todaySec)} de focus aujourd'hui
      </Text>

      <RunningBar />

      <BentoGrid>
        <BentoCard tone="primary" span={1} tall subtitle="aujourd'hui" title="Focus" icon="time">
          <Text variant="stat" color={theme.colors.onPrimary}>
            {formatDuration(todaySec)}
          </Text>
        </BentoCard>
        <BentoCard tone="secondary" span={1} tall subtitle={lateTasks ? `${lateTasks} en retard` : 'à faire'} title="Tâches" icon="checkbox">
          <Text variant="stat" color={theme.colors.ink}>
            {openTasks.length}
          </Text>
        </BentoCard>
      </BentoGrid>

      {/* Week focus goal */}
      <View style={{ marginTop: theme.spacing(3), backgroundColor: theme.colors.accent, borderRadius: theme.radius.bento, padding: theme.spacing(5) }}>
        <Text variant="label" color={theme.colors.onAccent}>
          Focus de la semaine
        </Text>
        <Text variant="body" color={theme.colors.onAccent} style={{ marginTop: 2 }}>
          {weekH.toFixed(1)} / {targetH} h · {Math.round(pct * 100)}%
        </Text>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: theme.colors.primary }} />
        </View>
      </View>

      {/* Sub-poles — stacked classification cards */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <StackedCard
          withHandle={false}
          title="Projets"
          subtitle={`${activeProjects} actif${activeProjects > 1 ? 's' : ''} · ${projects.length} au total`}
          center={String(activeProjects)}
          progress={projects.length ? activeProjects / projects.length : 0}
          bg={theme.colors.primary}
          fg={theme.colors.ink}
          ring={theme.colors.accent}
          onPress={() => router.push('/work/projects')}
        />
        <StackedCard
          title="Tâches"
          subtitle={`${openTasks.length} à faire · ${tasksDone} faites`}
          center={String(openTasks.length)}
          progress={tasks.length ? tasksDone / tasks.length : 0}
          bg={theme.colors.secondary}
          fg={theme.colors.ink}
          ring={theme.colors.accent}
          onPress={() => router.push('/work/tasks')}
        />
        <StackedCard
          title="Time-tracker"
          subtitle="Chrono & saisie manuelle"
          center={`${Math.round(todaySec / 60)}m`}
          progress={Math.min(1, todaySec / (8 * 3600))}
          bg={theme.colors.surface}
          fg={theme.colors.ink}
          ring={theme.colors.accent}
          onPress={() => router.push('/work/timetracker')}
        />
      </View>

      {/* Secondary links */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing(5) }}>
        <MiniLink icon="pulse" label="Énergie & focus" onPress={() => router.push('/work/energy')} />
        <MiniLink icon="bar-chart" label="Revue" onPress={() => router.push('/work/review')} />
      </View>
    </Screen>
  );
}

function MiniLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing(4),
        paddingHorizontal: theme.spacing(4),
      }}
    >
      <Ionicons name={icon} size={18} color={theme.colors.accent} />
      <Text variant="label" style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact bar shown only while a session is running — taps through to the tracker. */
function RunningBar() {
  const { theme } = useTheme();
  const router = useRouter();
  const { running, startedAt, projectTitle } = useTimer();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running || !startedAt) return;
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  if (!running) return null;
  return (
    <Pressable
      onPress={() => router.push('/work/timetracker')}
      style={{
        marginTop: theme.spacing(4),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.ink,
        borderRadius: theme.radius.pill,
        paddingVertical: 12,
        paddingHorizontal: 18,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: theme.colors.primary }} />
      <Text variant="label" color={theme.colors.bg} style={{ flex: 1 }}>
        En cours · {projectTitle ?? 'Sans projet'}
      </Text>
      <Text variant="label" color={theme.colors.primary}>
        {formatClock(elapsed)}
      </Text>
    </Pressable>
  );
}
