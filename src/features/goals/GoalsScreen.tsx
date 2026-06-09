import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { StackedCard } from '@/components/StackedCard';
import { Field, PrimaryButton } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryGoals, createGoal, updateGoal, deleteGoal } from '@/db/repositories/goals';
import type { Goal } from '@/db/models/Goal';
import { POLE } from '@/poles/types';

/** Alternating card palettes (lime / lilac / teal) for the stacked list. */
export const STACK_STYLES = [
  { bg: 'primary', fg: 'ink', ring: 'accent' },
  { bg: 'secondary', fg: 'ink', ring: 'accent' },
  { bg: 'accent', fg: 'onAccent', ring: 'primary' },
] as const;

export function GoalsScreen() {
  const { theme } = useTheme();
  const goals = useObservedQuery<Goal>(() => queryGoals(), [], ['current_value', 'target_value', 'title', 'unit']);
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Objectifs</Text>
          <Text variant="body" color={theme.colors.inkSoft}>
            Transverses à tous les pôles.
          </Text>
        </View>
        <Pressable
          onPress={() => setEditing({})}
          hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(5) }}>
        {goals.length === 0 ? (
          <BentoCard span={2} title="Aucun objectif" subtitle="Ajoute-en un avec le +." />
        ) : (
          goals.map((goal, i) => {
            const target = goal.targetValue ?? 0;
            const pct = target > 0 ? Math.min(1, goal.currentValue / target) : 0;
            const s = STACK_STYLES[i % STACK_STYLES.length];
            return (
              <StackedCard
                key={goal.id}
                withHandle={i > 0}
                title={goal.title}
                subtitle={`${goal.currentValue.toFixed(1)} / ${target} ${goal.unit ?? ''}`}
                center={`${Math.round(pct * 100)}%`}
                progress={pct}
                bg={theme.colors[s.bg]}
                fg={theme.colors[s.fg]}
                ring={theme.colors[s.ring]}
                onPress={() => setEditing({ goal })}
              />
            );
          })
        )}
      </View>

      <GoalModal editing={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function GoalModal({ editing, onClose }: { editing: { goal?: Goal } | null; onClose: () => void }) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.goal;

  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [current, setCurrent] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(existing?.title ?? '');
    setTarget(existing?.targetValue != null ? String(existing.targetValue) : '');
    setUnit(existing?.unit ?? '');
    setCurrent(existing ? String(existing.currentValue) : '0');
  }, [visible, existing]);

  const save = async () => {
    const targetValue = target ? Number(target.replace(',', '.')) : null;
    const currentValue = Number(current.replace(',', '.')) || 0;
    if (existing) {
      await updateGoal(existing, { title: title.trim() || existing.title, targetValue, unit: unit.trim() || null, currentValue });
    } else {
      await createGoal({
        poleId: POLE.planning,
        title: title.trim() || 'Objectif',
        targetType: 'reach',
        metric: `custom_${Date.now()}`,
        targetValue: targetValue ?? undefined,
        unit: unit.trim() || undefined,
      });
    }
    onClose();
  };
  const remove = async () => {
    if (existing) await deleteGoal(existing);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, padding: theme.spacing(6), gap: theme.spacing(3) }}>
          <Text variant="title">{existing ? "Modifier l'objectif" : 'Nouvel objectif'}</Text>
          <Field value={title} onChangeText={setTitle} placeholder="Titre (ex : Focus de la semaine)" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" color={theme.colors.inkSoft}>
                Cible
              </Text>
              <Field value={target} onChangeText={setTarget} placeholder="20" keyboardType="numeric" style={{ marginTop: 4 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" color={theme.colors.inkSoft}>
                Unité
              </Text>
              <Field value={unit} onChangeText={setUnit} placeholder="h, km…" style={{ marginTop: 4 }} />
            </View>
          </View>
          {existing ? (
            <View>
              <Text variant="label" color={theme.colors.inkSoft}>
                Progression actuelle
              </Text>
              <Field value={current} onChangeText={setCurrent} placeholder="0" keyboardType="numeric" style={{ marginTop: 4 }} />
            </View>
          ) : null}
          <PrimaryButton label={existing ? 'Enregistrer' : 'Créer'} onPress={save} />
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
