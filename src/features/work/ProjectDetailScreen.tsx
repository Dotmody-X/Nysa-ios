import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton, Field, PrimaryButton, AddRow } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import type { Entry } from '@/db/models/Entry';
import {
  type ProjectPayload,
  type TaskPayload,
  type TimeBlockPayload,
  type ProjectNotePayload,
  type ProjectFilePayload,
  type ProjectLinkPayload,
} from '@/poles/types';
import { formatDuration } from '@/lib/time';
import {
  queryProjects,
  queryTasks,
  queryTimeBlocks,
  queryProjectNotes,
  queryProjectFiles,
  queryProjectLinks,
  updateProject,
  setProjectStatus,
  toggleTask,
  createNote,
  updateNote,
  deleteNote,
  pickAndAddFile,
  deleteFile,
  addLink,
  deleteLink,
  billableAmount,
  STATUS_META,
} from './work';
import { rateForGroupe } from './groupes';
import { ProjectModal } from './ProjectModal';

export function ProjectDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const projects = useObservedQuery<Entry>(() => queryProjects(), [], ['title', 'payload']);
  const tasks = useObservedQuery<Entry>(() => queryTasks(), [], ['title', 'payload']);
  const blocks = useObservedQuery<Entry>(() => queryTimeBlocks(), [], ['payload']);
  const notes = useObservedQuery<Entry>(() => queryProjectNotes(), [], ['title', 'payload']);
  const files = useObservedQuery<Entry>(() => queryProjectFiles(), [], ['title', 'payload']);
  const links = useObservedQuery<Entry>(() => queryProjectLinks(), [], ['title', 'payload']);

  const [editing, setEditing] = useState(false);
  const [noteEdit, setNoteEdit] = useState<{ entry?: Entry } | null>(null);

  const project = projects.find((p) => p.id === id);
  const p = project?.payload as ProjectPayload | undefined;

  const projTasks = useMemo(() => tasks.filter((t) => (t.payload as TaskPayload).projectId === id), [tasks, id]);
  const projNotes = useMemo(() => notes.filter((n) => (n.payload as ProjectNotePayload).projectId === id), [notes, id]);
  const projLinks = useMemo(() => links.filter((l) => (l.payload as ProjectLinkPayload).projectId === id), [links, id]);
  const projFiles = useMemo(() => files.filter((f) => (f.payload as ProjectFilePayload).projectId === id), [files, id]);
  const timeSec = useMemo(
    () => blocks.filter((b) => (b.payload as TimeBlockPayload).projectId === id).reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0),
    [blocks, id],
  );

  if (!project || !p) {
    return (
      <Screen account={false}>
        <BackButton onPress={() => router.back()} />
        <Text variant="body" color={theme.colors.muted}>
          Projet introuvable.
        </Text>
      </Screen>
    );
  }

  const color = p.color ?? theme.colors.accent;
  const progress = p.progress ?? 0;
  const rate = rateForGroupe(p.groupe);
  const billable = billableAmount(blocks, project.id, rate);
  const openTasks = projTasks.filter((t) => !(t.payload as TaskPayload).done);

  return (
    <Screen account={false}>
      <BackButton onPress={() => router.back()} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: color, marginTop: 8 }} />
        <View style={{ flex: 1 }}>
          <Text variant="display">{project.title}</Text>
          <Text variant="body" color={theme.colors.inkSoft}>
            {(p.groupe ? `${p.groupe} · ` : '') + STATUS_META[p.status].label}
          </Text>
        </View>
        <Pressable
          onPress={() => setProjectStatus(project, p.status === 'archived' ? 'active' : 'archived')}
          hitSlop={8}
          style={iconBtn(theme)}
        >
          <Ionicons name={p.status === 'archived' ? 'archive' : 'archive-outline'} size={20} color={theme.colors.ink} />
        </Pressable>
        <Pressable onPress={() => setEditing(true)} hitSlop={8} style={iconBtn(theme)}>
          <Ionicons name="create-outline" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>

      {p.description ? (
        <Text variant="body" color={theme.colors.inkSoft} style={{ marginTop: theme.spacing(3) }}>
          {p.description}
        </Text>
      ) : null}

      {/* Progress */}
      <View style={{ marginTop: theme.spacing(5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="label" color={theme.colors.inkSoft} style={{ flex: 1 }}>
            Progression · {progress}%
          </Text>
        </View>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden', marginTop: 8 }}>
          <View style={{ width: `${progress}%`, height: 8, backgroundColor: color }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[0, 25, 50, 75, 100].map((v) => (
            <Pressable
              key={v}
              onPress={() => updateProject(project, { progress: v })}
              style={{ flex: 1, paddingVertical: 7, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: v === progress ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
            >
              <Text variant="label" color={v === progress ? theme.colors.bg : theme.colors.ink}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing(5) }}>
        <Stat label="Temps suivi" value={formatDuration(timeSec)} />
        {p.deadline ? <Stat label="Échéance" value={new Date(p.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} /> : null}
        {rate ? <Stat label="Facturable" value={`${billable.toFixed(0)} €`} /> : p.budget ? <Stat label="Budget" value={`${p.budget} €`} /> : null}
      </View>

      {/* Tasks */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing(7) }}>
        <Text variant="title" style={{ flex: 1 }}>
          Tâches ({openTasks.length})
        </Text>
        <Pressable onPress={() => router.push({ pathname: '/work/tasks', params: { projectId: project.id } })} hitSlop={8}>
          <Text variant="label" color={theme.colors.accent}>
            Gérer
          </Text>
        </Pressable>
      </View>
      <View style={{ marginTop: theme.spacing(3), gap: 8 }}>
        {projTasks.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucune tâche. Ouvre « Gérer » pour en ajouter.
          </Text>
        ) : (
          projTasks.slice(0, 8).map((t) => {
            const done = (t.payload as TaskPayload).done;
            return (
              <Pressable key={t.id} onPress={() => toggleTask(t)} style={row(theme)}>
                <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? theme.colors.success : theme.colors.muted} />
                <Text variant="body" color={done ? theme.colors.muted : theme.colors.ink} style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}>
                  {t.title}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Notes */}
      <Text variant="title" style={{ marginTop: theme.spacing(7), marginBottom: theme.spacing(3) }}>
        Notes
      </Text>
      <AddRow placeholder="Nouvelle note" onAdd={(t) => createNote(project.id, t, '')} />
      <View style={{ gap: 8 }}>
        {projNotes.map((n) => (
          <Pressable key={n.id} onPress={() => setNoteEdit({ entry: n })} style={row(theme)}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="body">{n.title}</Text>
              {(n.payload as ProjectNotePayload).content ? (
                <Text variant="label" color={theme.colors.muted} numberOfLines={1}>
                  {(n.payload as ProjectNotePayload).content}
                </Text>
              ) : null}
            </View>
            <Ionicons name="create-outline" size={16} color={theme.colors.muted} />
          </Pressable>
        ))}
      </View>

      {/* Links (knowledge) */}
      <Text variant="title" style={{ marginTop: theme.spacing(7), marginBottom: theme.spacing(3) }}>
        Liens
      </Text>
      <AddRow placeholder="https://… (lien, doc, réf)" onAdd={(t) => addLink(project.id, t)} />
      <View style={{ gap: 8 }}>
        {projLinks.map((l) => {
          const lp = l.payload as ProjectLinkPayload;
          return (
            <Pressable key={l.id} onPress={() => Linking.openURL(lp.url).catch(() => {})} style={row(theme)}>
              <Ionicons name="link" size={20} color={theme.colors.accent} />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {l.title}
              </Text>
              <Pressable onPress={() => deleteLink(l)} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.colors.muted} />
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      {/* Files */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing(7) }}>
        <Text variant="title" style={{ flex: 1 }}>
          Fichiers
        </Text>
        <Pressable onPress={() => pickAndAddFile(project.id)} hitSlop={8} style={iconBtn(theme)}>
          <Ionicons name="add" size={18} color={theme.colors.ink} />
        </Pressable>
      </View>
      <View style={{ marginTop: theme.spacing(3), gap: 8 }}>
        {projFiles.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucun fichier joint.
          </Text>
        ) : (
          projFiles.map((f) => {
            const fp = f.payload as ProjectFilePayload;
            return (
              <Pressable key={f.id} onPress={() => Linking.openURL(fp.uri).catch(() => {})} style={row(theme)}>
                <Ionicons name="attach" size={20} color={theme.colors.accent} />
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {f.title}
                </Text>
                <Pressable onPress={() => deleteFile(f)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={theme.colors.muted} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </View>

      <ProjectModal editing={editing ? { entry: project } : null} onClose={() => setEditing(false)} onDeleted={() => router.replace('/work/projects')} />
      <NoteModal noteEdit={noteEdit} onClose={() => setNoteEdit(null)} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(4) }}>
      <Text variant="label" color={theme.colors.muted}>
        {label}
      </Text>
      <Text variant="body" style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function NoteModal({ noteEdit, onClose }: { noteEdit: { entry?: Entry } | null; onClose: () => void }) {
  const { theme } = useTheme();
  const visible = noteEdit !== null;
  const existing = noteEdit?.entry;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setTitle(existing?.title ?? '');
    setContent((existing?.payload as ProjectNotePayload | undefined)?.content ?? '');
  }, [visible, existing]);

  const save = async () => {
    if (existing) await updateNote(existing, { title, content });
    onClose();
  };
  const remove = async () => {
    if (existing) await deleteNote(existing);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, padding: theme.spacing(6), gap: theme.spacing(3) }}>
          <Text variant="title">Note</Text>
          <Field value={title} onChangeText={setTitle} placeholder="Titre" />
          <Field value={content} onChangeText={setContent} placeholder="Contenu" multiline style={{ minHeight: 120, textAlignVertical: 'top' }} />
          <PrimaryButton label="Enregistrer" onPress={save} />
          <Pressable onPress={remove} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text variant="label" color={theme.colors.danger}>
              Supprimer
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const iconBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 40,
  height: 40,
  borderRadius: t.radius.pill,
  borderWidth: 1,
  borderColor: t.colors.border,
  backgroundColor: t.colors.surface,
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
