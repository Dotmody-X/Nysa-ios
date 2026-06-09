import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { Field, PrimaryButton } from '@/components/ListUI';
import { DateTimeFields } from '@/components/DateTimePicker';
import { useTheme } from '@/theme/ThemeProvider';
import type { Entry } from '@/db/models/Entry';
import { type ProjectPayload, type ProjectStatus, type Priority } from '@/poles/types';
import { createProject, updateProject, deleteProject, PROJECT_COLORS, PRIORITY_META, STATUS_META } from './work';
import { useGroupes } from './groupes';

export function ProjectModal({
  editing,
  onClose,
  onDeleted,
}: {
  editing: { entry?: Entry } | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.entry;

  const [title, setTitle] = useState('');
  const [groupe, setGroupe] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [priority, setPriority] = useState<Priority>('med');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState(() => new Date());
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const groupes = useGroupes((s) => s.groupes);

  useEffect(() => {
    if (!visible) return;
    const p = existing?.payload as ProjectPayload | undefined;
    setTitle(existing?.title ?? '');
    setGroupe(p?.groupe ?? '');
    setColor(p?.color ?? PROJECT_COLORS[0]);
    setPriority(p?.priority ?? 'med');
    setStatus(p?.status ?? 'active');
    setHasDeadline(p?.deadline != null);
    setDeadline(p?.deadline ? new Date(p.deadline) : new Date());
    setBudget(p?.budget != null ? String(p.budget) : '');
    setDescription(p?.description ?? '');
  }, [visible, existing]);

  const submit = async () => {
    const args = {
      title,
      groupe,
      color,
      priority,
      status,
      deadline: hasDeadline ? deadline.getTime() : undefined,
      budget: budget ? Number(budget) : undefined,
      description,
    };
    if (existing) await updateProject(existing, args);
    else await createProject(args);
    onClose();
  };
  const remove = async () => {
    if (existing) {
      await deleteProject(existing);
      onDeleted?.();
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, maxHeight: '90%' }}>
          <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: theme.spacing(6), gap: theme.spacing(3) }}>
            <Text variant="title">{existing ? 'Modifier le projet' : 'Nouveau projet'}</Text>
            <Field value={title} onChangeText={setTitle} placeholder="Nom du projet" />

            {/* Groupe (managed in account settings) */}
            <Text variant="label" color={theme.colors.inkSoft}>
              Groupe / marque
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {groupes.map((g) => {
                const active = g.name === groupe;
                return (
                  <Pressable key={g.id} onPress={() => setGroupe(active ? '' : g.name)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                      {g.name}
                      {g.rate ? ` · ${g.rate}€/h` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption" color={theme.colors.muted}>
              Gère les groupes et leurs tarifs dans Compte.
            </Text>

            {/* Color */}
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: theme.colors.ink }}
                />
              ))}
            </View>

            {/* Priority */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(PRIORITY_META) as Priority[]).map((k) => {
                const active = k === priority;
                return (
                  <Pressable key={k} onPress={() => setPriority(k)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active ? PRIORITY_META[k].color : theme.colors.surface, borderWidth: 1, borderColor: active ? PRIORITY_META[k].color : theme.colors.border }}>
                    <Text variant="label" color={active ? '#fff' : theme.colors.ink}>
                      {PRIORITY_META[k].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Status */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(STATUS_META) as ProjectStatus[]).map((k) => {
                const active = k === status;
                return (
                  <Pressable key={k} onPress={() => setStatus(k)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                      {STATUS_META[k].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Deadline */}
            <Pressable onPress={() => setHasDeadline(!hasDeadline)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={hasDeadline ? 'checkbox' : 'square-outline'} size={22} color={hasDeadline ? theme.colors.primary : theme.colors.muted} />
              <Text variant="label">Échéance</Text>
            </Pressable>
            {hasDeadline ? <DateTimeFields value={deadline} onChange={setDeadline} withDate collapsible /> : null}

            {/* Budget */}
            <Text variant="label" color={theme.colors.inkSoft}>
              Budget (€)
            </Text>
            <Field value={budget} onChangeText={setBudget} placeholder="0" keyboardType="numeric" />

            <Field value={description} onChangeText={setDescription} placeholder="Description (optionnel)" multiline style={{ minHeight: 64, textAlignVertical: 'top' }} />

            <PrimaryButton label={existing ? 'Enregistrer' : 'Créer le projet'} onPress={submit} />
            {existing ? (
              <Pressable onPress={remove} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text variant="label" color={theme.colors.danger}>
                  Supprimer le projet
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
