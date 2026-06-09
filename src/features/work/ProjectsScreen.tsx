import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton } from '@/components/ListUI';
import { StackedCard, fgOn } from '@/components/StackedCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import type { Entry } from '@/db/models/Entry';
import { type ProjectPayload, type ProjectStatus } from '@/poles/types';
import { queryProjects, STATUS_META } from './work';
import { ProjectModal } from './ProjectModal';

type Filter = 'open' | 'done' | 'archived';

export function ProjectsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const projects = useObservedQuery<Entry>(() => queryProjects(), [], ['title', 'payload']);
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<{ entry?: Entry } | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const s = (p.payload as ProjectPayload).status;
      if (filter === 'archived') return s === 'archived';
      if (filter === 'done') return s === 'completed';
      return s === 'active' || s === 'paused';
    });
  }, [projects, filter]);

  const groups = useMemo(() => {
    const m: Record<string, Entry[]> = {};
    for (const p of filtered) {
      const g = (p.payload as ProjectPayload).groupe || 'Sans groupe';
      (m[g] ??= []).push(p);
    }
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <Screen account={false}>
      <BackButton onPress={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Projets</Text>
          <Text variant="body" color={theme.colors.inkSoft}>
            {filtered.length} projet{filtered.length > 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable onPress={() => setEditing({})} hitSlop={8} style={addBtn(theme)}>
          <Ionicons name="add" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(4) }}>
        {(['open', 'done', 'archived'] as Filter[]).map((f) => {
          const active = f === filter;
          const label = f === 'open' ? 'En cours' : f === 'done' ? 'Terminés' : 'Archivés';
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={{ flex: 1, paddingVertical: 9, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Text variant="caption" color={theme.colors.muted} style={{ marginTop: theme.spacing(5) }}>
          Aucun projet. Crées-en un avec le +.
        </Text>
      ) : (
        groups.map(([groupe, items]) => (
          <View key={groupe} style={{ marginTop: theme.spacing(5) }}>
            <Text variant="label" color={theme.colors.muted} style={{ marginBottom: theme.spacing(2), textTransform: 'uppercase' }}>
              {groupe}
            </Text>
            <View>
              {items.map((p, idx) => {
                const pl = p.payload as ProjectPayload;
                const color = pl.color ?? theme.colors.accent;
                const fg = fgOn(color);
                const progress = pl.progress ?? 0;
                const deadline = pl.deadline ? new Date(pl.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;
                return (
                  <StackedCard
                    key={p.id}
                    withHandle={idx > 0}
                    title={p.title}
                    subtitle={[STATUS_META[pl.status].label, deadline ? `échéance ${deadline}` : null].filter(Boolean).join(' · ')}
                    center={`${progress}%`}
                    progress={progress / 100}
                    bg={color}
                    fg={fg}
                    ring={fg}
                    onPress={() => router.push({ pathname: '/work/project', params: { id: p.id } })}
                  />
                );
              })}
            </View>
          </View>
        ))
      )}

      <ProjectModal editing={editing} onClose={() => setEditing(null)} />
    </Screen>
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
