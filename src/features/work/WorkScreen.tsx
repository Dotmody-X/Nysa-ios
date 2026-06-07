import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries, queryEntriesBetween, patchPayload } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ProjectPayload, type TaskPayload, type TimeBlockPayload } from '@/poles/types';
import { startOfDay, endOfDay, formatClock, formatDuration } from '@/lib/time';
import { useTimer } from './timerStore';
import { finishSession } from './tracking';
import { EnergyModal } from './EnergyModal';

export function WorkScreen() {
  const { theme } = useTheme();

  const projects = useObservedQuery<Entry>(() => queryEntries(POLE.work, 'project'), [], ['title', 'payload']);
  const tasks = useObservedQuery<Entry>(() => queryEntries(POLE.work, 'task'), [], ['title', 'payload']);
  const todayBlocks = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.work, 'time_block', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0] ?? null;

  const todaySec = useMemo(
    () => todayBlocks.reduce((sum, b) => sum + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0),
    [todayBlocks],
  );

  const projectTasks = useMemo(
    () => tasks.filter((t) => (t.payload as TaskPayload).projectId === selected?.id),
    [tasks, selected?.id],
  );

  return (
    <Screen>
      <Text variant="display">Travail</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        {formatDuration(todaySec)} de focus aujourd'hui
      </Text>

      <TimerWidget project={selected} />

      {/* Project chips */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Projets</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing(3) }}>
          {projects.map((p) => {
            const active = p.id === selected?.id;
            const color = (p.payload as ProjectPayload).color ?? theme.colors.accent;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedId(p.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? theme.colors.ink : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color }} />
                <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                  {p.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tasks of selected project */}
      <View style={{ marginTop: theme.spacing(6), gap: 10 }}>
        {projectTasks.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucune tâche pour ce projet.
          </Text>
        ) : (
          projectTasks.map((task) => {
            const done = (task.payload as TaskPayload).done;
            return (
              <Pressable
                key={task.id}
                onPress={() => patchPayload<'task'>(task, { done: !done })}
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
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={done ? theme.colors.success : theme.colors.muted}
                />
                <Text
                  variant="body"
                  color={done ? theme.colors.muted : theme.colors.ink}
                  style={done ? { textDecorationLine: 'line-through' } : undefined}
                >
                  {task.title}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

/** Live timer + start/stop. Stopping opens the energy check-in, then writes
 * the whole interconnected session via finishSession(). */
function TimerWidget({ project }: { project: Entry | null }) {
  const { theme } = useTheme();
  const { running, startedAt, start, reset } = useTimer();
  const [elapsed, setElapsed] = useState(0);
  const [pendingEnd, setPendingEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!running || !startedAt) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  const onStop = () => setPendingEnd(Date.now());

  const commit = async (energy?: { level: 1 | 2 | 3 | 4 | 5; focus: 1 | 2 | 3 | 4 | 5 }) => {
    if (!startedAt || !pendingEnd) return;
    await finishSession({
      startedAt,
      endedAt: pendingEnd,
      projectId: project?.id,
      projectTitle: project?.title,
      energy,
    });
    setPendingEnd(null);
    reset();
  };

  return (
    <>
      <BentoCard tone={running ? 'accent' : 'surface'} span={2} tall>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <Text variant="label" color={running ? theme.colors.onAccent : theme.colors.inkSoft}>
            {running ? `En cours · ${project?.title ?? 'Sans projet'}` : 'Time tracker'}
          </Text>
          <Text variant="stat" color={running ? theme.colors.onAccent : theme.colors.ink} style={{ fontSize: 44, lineHeight: 48 }}>
            {formatClock(running ? elapsed : 0)}
          </Text>
          <Pressable
            onPress={() => (running ? onStop() : start({ projectId: project?.id, projectTitle: project?.title }))}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: theme.radius.pill,
              backgroundColor: running ? theme.colors.bg : theme.colors.primary,
            }}
          >
            <Ionicons name={running ? 'stop' : 'play'} size={18} color={theme.colors.ink} />
            <Text variant="label" color={theme.colors.ink}>
              {running ? 'Arrêter' : 'Démarrer'}
            </Text>
          </Pressable>
        </View>
      </BentoCard>

      <EnergyModal
        visible={pendingEnd !== null}
        durationLabel={formatDuration(startedAt && pendingEnd ? Math.round((pendingEnd - startedAt) / 1000) : 0)}
        onCancel={() => commit(undefined)}
        onSubmit={(energy) => commit(energy)}
      />
    </>
  );
}
