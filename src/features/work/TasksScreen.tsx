import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton, Field, PrimaryButton } from '@/components/ListUI';
import { DateTimeFields } from '@/components/DateTimePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import type { Entry } from '@/db/models/Entry';
import { type TaskPayload, type ProjectPayload, type Priority } from '@/poles/types';
import { queryProjects, queryTasks, createTask, updateTask, toggleTask, deleteTask, PRIORITY_META } from './work';

const DAY = 86_400_000;
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, med: 2, low: 3 };
type Filter = 'open' | 'today' | 'done';

export function TasksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const projectFilter = params.projectId ?? null;

  const tasks = useObservedQuery<Entry>(() => queryTasks(), [], ['title', 'payload']);
  const projects = useObservedQuery<Entry>(() => queryProjects(), [], ['title', 'payload']);
  const projById = useMemo(() => {
    const m: Record<string, Entry> = {};
    projects.forEach((p) => (m[p.id] = p));
    return m;
  }, [projects]);

  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<{ entry?: Entry } | null>(null);

  const endToday = new Date().setHours(23, 59, 59, 999);
  const visible = useMemo(() => {
    let list = tasks;
    if (projectFilter) list = list.filter((t) => (t.payload as TaskPayload).projectId === projectFilter);
    list = list.filter((t) => {
      const p = t.payload as TaskPayload;
      if (filter === 'done') return p.done;
      if (filter === 'today') return !p.done && p.due != null && p.due <= endToday;
      return !p.done;
    });
    return [...list].sort((a, b) => {
      const pa = a.payload as TaskPayload;
      const pb = b.payload as TaskPayload;
      const da = pa.due ?? Infinity;
      const db = pb.due ?? Infinity;
      if (da !== db) return da - db;
      return PRIORITY_ORDER[pa.priority ?? 'med'] - PRIORITY_ORDER[pb.priority ?? 'med'];
    });
  }, [tasks, filter, projectFilter, endToday]);

  const projName = projectFilter ? projById[projectFilter]?.title : null;

  return (
    <Screen account={false}>
      <BackButton onPress={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Tâches</Text>
          {projName ? (
            <Text variant="body" color={theme.colors.inkSoft}>
              Projet · {projName}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={() => setEditing({})} hitSlop={8} style={addBtn(theme)}>
          <Ionicons name="add" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(4) }}>
        {(['open', 'today', 'done'] as Filter[]).map((f) => {
          const active = f === filter;
          const label = f === 'open' ? 'À faire' : f === 'today' ? "Aujourd'hui" : 'Terminées';
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
            >
              <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: theme.spacing(4), gap: 10 }}>
        {visible.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Rien ici.
          </Text>
        ) : (
          visible.map((t) => <TaskRow key={t.id} task={t} project={projById[(t.payload as TaskPayload).projectId ?? '']} onEdit={() => setEditing({ entry: t })} />)
        )}
      </View>

      <TaskModal editing={editing} projects={projects} defaultProjectId={projectFilter} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function TaskRow({ task, project, onEdit }: { task: Entry; project?: Entry; onEdit: () => void }) {
  const { theme } = useTheme();
  const p = task.payload as TaskPayload;
  const prio = PRIORITY_META[p.priority ?? 'med'];
  const overdue = !p.done && p.due != null && p.due < new Date().setHours(0, 0, 0, 0);
  const dueLabel = p.due
    ? `${new Date(p.due).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}${p.dueTime ? ` ${p.dueTime}` : ''}`
    : null;
  return (
    <Pressable
      onPress={onEdit}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(4) }}
    >
      <Pressable onPress={() => toggleTask(task)} hitSlop={8}>
        <Ionicons name={p.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={p.done ? theme.colors.success : theme.colors.muted} />
      </Pressable>
      <View style={{ width: 4, height: 34, borderRadius: 999, backgroundColor: prio.color }} />
      <View style={{ flex: 1 }}>
        <Text variant="body" color={p.done ? theme.colors.muted : theme.colors.ink} style={p.done ? { textDecorationLine: 'line-through' } : undefined}>
          {task.title}
        </Text>
        <Text variant="label" color={overdue ? theme.colors.danger : theme.colors.muted}>
          {[project?.title, dueLabel, p.recurrence && p.recurrence !== 'none' ? '↻' : null].filter(Boolean).join(' · ') || prio.label}
        </Text>
      </View>
      <Ionicons name="create-outline" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

function TaskModal({
  editing,
  projects,
  defaultProjectId,
  onClose,
}: {
  editing: { entry?: Entry } | null;
  projects: Entry[];
  defaultProjectId: string | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.entry;

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('med');
  const [hasDue, setHasDue] = useState(false);
  const [due, setDue] = useState(() => new Date());
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!visible) return;
    const p = existing?.payload as TaskPayload | undefined;
    setTitle(existing?.title ?? '');
    setProjectId(p?.projectId ?? defaultProjectId ?? null);
    setPriority(p?.priority ?? 'med');
    setHasDue(p?.due != null);
    setDue(p?.due ? new Date(p.due) : new Date());
    setRecurrence(p?.recurrence ?? 'none');
    setTags(p?.tags?.join(', ') ?? '');
  }, [visible, existing, defaultProjectId]);

  const submit = async () => {
    const args = {
      title,
      projectId: projectId ?? undefined,
      priority,
      due: hasDue ? due.getTime() : undefined,
      dueTime: hasDue ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}` : undefined,
      recurrence,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (existing) await updateTask(existing, args);
    else await createTask(args);
    onClose();
  };
  const remove = async () => {
    if (existing) await deleteTask(existing);
    onClose();
  };

  const active = projects.filter((p) => (p.payload as ProjectPayload).status === 'active');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, maxHeight: '90%' }}>
          <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: theme.spacing(6), gap: theme.spacing(3) }}>
            <Text variant="title">{existing ? 'Modifier la tâche' : 'Nouvelle tâche'}</Text>
            <Field value={title} onChangeText={setTitle} placeholder="Titre" />

            {/* Priority */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(PRIORITY_META) as Priority[]).map((k) => {
                const active2 = k === priority;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setPriority(k)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active2 ? PRIORITY_META[k].color : theme.colors.surface, borderWidth: 1, borderColor: active2 ? PRIORITY_META[k].color : theme.colors.border }}
                  >
                    <Text variant="label" color={active2 ? '#fff' : theme.colors.ink}>
                      {PRIORITY_META[k].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Project */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <ProjChip label="Sans projet" active={projectId == null} color={theme.colors.muted} onPress={() => setProjectId(null)} />
              {active.map((p) => (
                <ProjChip key={p.id} label={p.title} active={projectId === p.id} color={(p.payload as ProjectPayload).color ?? theme.colors.accent} onPress={() => setProjectId(p.id)} />
              ))}
            </View>

            {/* Due */}
            <Pressable onPress={() => setHasDue(!hasDue)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={hasDue ? 'checkbox' : 'square-outline'} size={22} color={hasDue ? theme.colors.primary : theme.colors.muted} />
              <Text variant="label">Échéance</Text>
            </Pressable>
            {hasDue ? <DateTimeFields value={due} onChange={setDue} withDate collapsible /> : null}

            {/* Recurrence */}
            <Text variant="label" color={theme.colors.inkSoft}>
              Récurrence
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => {
                const active2 = r === recurrence;
                const label = r === 'none' ? 'Aucune' : r === 'daily' ? 'Quotidien' : r === 'weekly' ? 'Hebdo' : 'Mensuel';
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRecurrence(r)}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active2 ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
                  >
                    <Text variant="label" color={active2 ? theme.colors.bg : theme.colors.ink}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field value={tags} onChangeText={setTags} placeholder="Tags (séparés par des virgules)" />

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

const addBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 36,
  height: 36,
  borderRadius: t.radius.pill,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});
