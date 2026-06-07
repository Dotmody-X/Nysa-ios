import React, { useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import {
  POLE,
  type ChorePayload,
  type MaintenancePayload,
  type SubscriptionPayload,
} from '@/poles/types';
import {
  addChore,
  addMaintenance,
  addSubscription,
  removeChore,
  removeMaintenance,
  removeSubscription,
  toggleChore,
} from './household';

const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const DUE = [
  ['1 sem.', 7],
  ['1 mois', 30],
  ['3 mois', 90],
  ['6 mois', 180],
  ['1 an', 365],
] as const;

export function HouseholdScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.home;

  const chores = useObservedQuery<Entry>(() => queryEntries(POLE.home, 'chore'), [], ['title', 'payload']);
  const subs = useObservedQuery<Entry>(() => queryEntries(POLE.home, 'subscription'), [], ['title', 'payload']);
  const maint = useObservedQuery<Entry>(() => queryEntries(POLE.home, 'maintenance'), [], ['title', 'payload']);

  const subsTotal = useMemo(() => subs.reduce((a, s) => a + ((s.payload as SubscriptionPayload).monthlyCost || 0), 0), [subs]);
  const sortedMaint = useMemo(
    () => [...maint].sort((a, b) => ((a.payload as MaintenancePayload).dueDate ?? Infinity) - ((b.payload as MaintenancePayload).dueDate ?? Infinity)),
    [maint],
  );

  const [subModal, setSubModal] = useState(false);
  const [maintModal, setMaintModal] = useState(false);

  return (
    <Screen account={false}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} hitSlop={10} style={squareBtn(theme)}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Maison</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Tâches, abonnements et entretien.
      </Text>

      {/* Chores */}
      <Section title="Tâches ménagères" />
      <AddRow placeholder="Ajouter une tâche…" onAdd={(t) => addChore(t)} />
      <View style={{ gap: 10, marginTop: 10 }}>
        {chores.map((c) => {
          const done = (c.payload as ChorePayload).done;
          return (
            <View key={c.id} style={row(theme)}>
              <Pressable onPress={() => toggleChore(c)} hitSlop={8}>
                <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? theme.colors.success : theme.colors.muted} />
              </Pressable>
              <Text variant="body" style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through', color: theme.colors.muted } : null]}>
                {c.title}
              </Text>
              <Pressable onPress={() => removeChore(c)} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.colors.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Subscriptions */}
      <Section
        title="Abonnements"
        right={
          <Pressable onPress={() => setSubModal(true)} style={pillBtn(theme, theme.colors.surface)}>
            <Ionicons name="add" size={16} color={theme.colors.ink} />
            <Text variant="label">Ajouter</Text>
          </Pressable>
        }
      />
      {subs.length > 0 ? (
        <Text variant="label" color={theme.colors.inkSoft} style={{ marginBottom: 8 }}>
          Total : {eur(subsTotal)} / mois
        </Text>
      ) : null}
      <View style={{ gap: 10 }}>
        {subs.map((s) => (
          <View key={s.id} style={row(theme)}>
            <View style={{ width: 40, height: 40, borderRadius: theme.radius.pill, backgroundColor: palette.solid, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="repeat" size={18} color={palette.on} />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {s.title}
            </Text>
            <Text variant="label">{eur((s.payload as SubscriptionPayload).monthlyCost)}</Text>
            <Pressable onPress={() => removeSubscription(s)} hitSlop={8} style={{ marginLeft: 8 }}>
              <Ionicons name="close" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Maintenance */}
      <Section
        title="Entretien"
        right={
          <Pressable onPress={() => setMaintModal(true)} style={pillBtn(theme, theme.colors.surface)}>
            <Ionicons name="add" size={16} color={theme.colors.ink} />
            <Text variant="label">Ajouter</Text>
          </Pressable>
        }
      />
      <View style={{ gap: 10 }}>
        {sortedMaint.map((m) => {
          const p = m.payload as MaintenancePayload;
          const overdue = p.dueDate ? p.dueDate < Date.now() : false;
          return (
            <View key={m.id} style={row(theme)}>
              <Ionicons name="construct" size={20} color={palette.solid} />
              <View style={{ flex: 1 }}>
                <Text variant="body">{m.title}</Text>
                {p.dueDate ? (
                  <Text variant="label" color={overdue ? theme.colors.danger : theme.colors.muted}>
                    {overdue ? 'En retard · ' : 'Échéance · '}
                    {fmtDate(p.dueDate)}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeMaintenance(m)} hitSlop={8}>
                <Ionicons name="close" size={18} color={theme.colors.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <SubscriptionModal visible={subModal} onClose={() => setSubModal(false)} />
      <MaintenanceModal visible={maintModal} onClose={() => setMaintModal(false)} />
    </Screen>
  );
}

function SubscriptionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const submit = async () => {
    const n = parseFloat(cost.replace(',', '.'));
    if (!name.trim() || !n) return;
    await addSubscription(name.trim(), n);
    setName('');
    setCost('');
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Nouvel abonnement">
      <TextInput value={name} onChangeText={setName} placeholder="Nom (ex : Netflix)" placeholderTextColor={theme.colors.muted} style={field(theme)} />
      <TextInput value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Coût mensuel (€)" placeholderTextColor={theme.colors.muted} style={field(theme)} />
      <Primary label="Ajouter" onPress={submit} />
    </Sheet>
  );
}

function MaintenanceModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [days, setDays] = useState<number>(30);
  const submit = async () => {
    if (!name.trim()) return;
    await addMaintenance(name.trim(), Date.now() + days * 86400000);
    setName('');
    setDays(30);
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Nouvel entretien">
      <TextInput value={name} onChangeText={setName} placeholder="Quoi ? (ex : Révision chaudière)" placeholderTextColor={theme.colors.muted} style={field(theme)} />
      <Text variant="label" color={theme.colors.inkSoft}>
        Échéance
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DUE.map(([label, d]) => (
          <Pressable
            key={d}
            onPress={() => setDays(d)}
            style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.radius.md, backgroundColor: days === d ? theme.colors.primary : theme.colors.surfaceAlt }}
          >
            <Text variant="label" color={days === d ? theme.colors.onPrimary : theme.colors.ink}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Primary label="Ajouter" onPress={submit} />
    </Sheet>
  );
}

// ---- shared bits ----------------------------------------------------------
function Section({ title, right }: { title: string; right?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: theme.spacing(7), marginBottom: theme.spacing(3), flexDirection: 'row', alignItems: 'center' }}>
      <Text variant="title" style={{ flex: 1 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput value={text} onChangeText={setText} onSubmitEditing={submit} returnKeyType="done" placeholder={placeholder} placeholderTextColor={theme.colors.muted} style={[field(theme), { flex: 1 }]} />
      <Pressable onPress={submit} style={{ width: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, padding: theme.spacing(6), gap: theme.spacing(3) }}
        >
          <Text variant="title">{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Primary({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}>
      <Text variant="label" color={theme.colors.onPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}

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
const squareBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 44,
  height: 44,
  borderRadius: t.radius.pill,
  backgroundColor: t.colors.surface,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  marginBottom: t.spacing(4),
});
const pillBtn = (t: ReturnType<typeof useTheme>['theme'], bg: string) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: t.radius.pill,
  backgroundColor: bg,
  borderWidth: 1,
  borderColor: t.colors.border,
});
const field = (t: ReturnType<typeof useTheme>['theme']) => ({
  fontFamily: t.fonts.body,
  fontSize: 15,
  color: t.colors.ink,
  backgroundColor: t.colors.surface,
  borderWidth: 1,
  borderColor: t.colors.border,
  borderRadius: t.radius.md,
  paddingHorizontal: 16,
  paddingVertical: 12,
});
