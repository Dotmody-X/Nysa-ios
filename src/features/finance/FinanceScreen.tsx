import React, { useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoGrid } from '@/components/BentoGrid';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries, queryEntriesBetween } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import {
  POLE,
  type BudgetPayload,
  type SubscriptionPayload,
  type TransactionPayload,
} from '@/poles/types';
import { startOfMonth, endOfMonth } from '@/lib/time';
import { addTransaction, removeTransaction, setBudget } from './finance';

const eur = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;

export function FinanceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.finance;

  const txns = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.finance, 'transaction', startOfMonth(), endOfMonth()),
    [],
    ['payload', 'title'],
  );
  const budgets = useObservedQuery<Entry>(() => queryEntries(POLE.finance, 'budget'), [], ['payload']);
  const subs = useObservedQuery<Entry>(() => queryEntries(POLE.home, 'subscription'), [], ['payload']);

  const { spent, income } = useMemo(() => {
    let s = 0;
    let inc = 0;
    for (const t of txns) {
      const p = t.payload as TransactionPayload;
      if (p.kind === 'expense') s += p.amount;
      else inc += p.amount;
    }
    return { spent: s, income: inc };
  }, [txns]);

  const subsTotal = useMemo(
    () => subs.reduce((a, s) => a + ((s.payload as SubscriptionPayload).monthlyCost || 0), 0),
    [subs],
  );

  const budget = (budgets[0]?.payload as BudgetPayload | undefined)?.monthly ?? 0;
  const budgetPct = budget > 0 ? Math.min(1, spent / budget) : 0;
  const net = income - spent;

  const [adding, setAdding] = useState(false);

  return (
    <Screen account={false}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} hitSlop={10} style={squareBtn(theme)}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Finances</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Ce mois-ci.
      </Text>

      <BentoGrid>
        <BentoCard tall icon="trending-down" title="Dépensé" accent="accent" subtitle="ce mois">
          <Text variant="stat">{eur(spent)}</Text>
        </BentoCard>
        <BentoCard tall icon="trending-up" title="Entrées" accent="accent" subtitle="ce mois">
          <Text variant="stat">{eur(income)}</Text>
        </BentoCard>

        <BentoCard span={2} tone="accent" icon="wallet" title="Solde du mois" subtitle={net >= 0 ? 'Tu es dans le vert' : 'Attention, négatif'}>
          <Text variant="stat" color={theme.colors.onAccent} style={{ fontSize: 34 }}>
            {net >= 0 ? '+' : ''}
            {eur(net)}
          </Text>
        </BentoCard>

        {budget > 0 ? (
          <BentoCard span={2} icon="speedometer" title="Budget" accent="accent" subtitle={`${eur(spent)} / ${eur(budget)} · ${Math.round(budgetPct * 100)}%`}>
            <View style={{ height: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden', marginTop: 4 }}>
              <View
                style={{
                  width: `${budgetPct * 100}%`,
                  height: '100%',
                  backgroundColor: budgetPct > 0.9 ? theme.colors.danger : palette.solid,
                }}
              />
            </View>
          </BentoCard>
        ) : null}

        {/* Interconnexion : abonnements (Maison) → dépenses récurrentes */}
        <BentoCard
          span={2}
          icon="repeat"
          title="Abonnements"
          accent="accent"
          subtitle={subs.length ? `${eur(subsTotal)} / mois · depuis le pôle Maison` : 'Aucun — gère-les dans Maison'}
          onPress={() => router.push('/household')}
        />
      </BentoGrid>

      {/* Recent transactions */}
      <View style={{ marginTop: theme.spacing(6), flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title" style={{ flex: 1 }}>
          Transactions
        </Text>
        <Pressable onPress={() => setAdding(true)} style={pillBtn(theme, theme.colors.primary)}>
          <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
          <Text variant="label" color={theme.colors.onPrimary}>
            Ajouter
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
        {txns.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucune transaction ce mois-ci.
          </Text>
        ) : (
          txns.map((t) => {
            const p = t.payload as TransactionPayload;
            const expense = p.kind === 'expense';
            return (
              <View key={t.id} style={row(theme)}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.pill,
                    backgroundColor: expense ? theme.colors.surfaceAlt : palette.solid,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={expense ? 'arrow-down' : 'arrow-up'} size={18} color={expense ? theme.colors.ink : palette.on} />
                </View>
                <Text variant="body" style={{ flex: 1 }}>
                  {p.category}
                </Text>
                <Text variant="label" color={expense ? theme.colors.ink : theme.colors.success}>
                  {expense ? '-' : '+'}
                  {eur(p.amount)}
                </Text>
                <Pressable onPress={() => removeTransaction(t)} hitSlop={8} style={{ marginLeft: 8 }}>
                  <Ionicons name="close" size={18} color={theme.colors.muted} />
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      <AddTransactionSheet visible={adding} onClose={() => setAdding(false)} hasBudget={budget > 0} onSetBudget={setBudget} />
    </Screen>
  );
}

function AddTransactionSheet({
  visible,
  onClose,
  hasBudget,
  onSetBudget,
}: {
  visible: boolean;
  onClose: () => void;
  hasBudget: boolean;
  onSetBudget: (n: number) => void;
}) {
  const { theme } = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [budgetInput, setBudgetInput] = useState('');

  const submit = async () => {
    const n = parseFloat(amount.replace(',', '.'));
    if (!n || !category.trim()) return;
    await addTransaction({ amount: n, kind, category: category.trim() });
    setAmount('');
    setCategory('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={sheet(theme)}>
          <Text variant="title">Nouvelle transaction</Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['expense', 'income'] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: theme.radius.md,
                  alignItems: 'center',
                  backgroundColor: kind === k ? theme.colors.ink : theme.colors.surfaceAlt,
                }}
              >
                <Text variant="label" color={kind === k ? theme.colors.bg : theme.colors.ink}>
                  {k === 'expense' ? 'Dépense' : 'Entrée'}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Montant (€)" placeholderTextColor={theme.colors.muted} style={field(theme)} />
          <TextInput value={category} onChangeText={setCategory} placeholder="Catégorie (ex : Courses)" placeholderTextColor={theme.colors.muted} style={field(theme)} />

          <Pressable onPress={submit} style={primary(theme)}>
            <Text variant="label" color={theme.colors.onPrimary}>
              Ajouter
            </Text>
          </Pressable>

          {!hasBudget ? (
            <View style={{ marginTop: theme.spacing(2), gap: 8 }}>
              <Text variant="label" color={theme.colors.inkSoft}>
                Définir un budget mensuel
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput value={budgetInput} onChangeText={setBudgetInput} keyboardType="decimal-pad" placeholder="ex : 1500" placeholderTextColor={theme.colors.muted} style={[field(theme), { flex: 1 }]} />
                <Pressable
                  onPress={() => {
                    const n = parseFloat(budgetInput.replace(',', '.'));
                    if (n) onSetBudget(n);
                    setBudgetInput('');
                  }}
                  style={{ paddingHorizontal: 18, borderRadius: theme.radius.md, backgroundColor: theme.colors.ink, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text variant="label" color={theme.colors.bg}>
                    OK
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
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
});
const sheet = (t: ReturnType<typeof useTheme>['theme']) => ({
  backgroundColor: t.colors.bg,
  borderTopLeftRadius: t.radius.bento,
  borderTopRightRadius: t.radius.bento,
  padding: t.spacing(6),
  gap: t.spacing(3),
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
const primary = (t: ReturnType<typeof useTheme>['theme']) => ({
  marginTop: t.spacing(1),
  paddingVertical: 14,
  borderRadius: t.radius.pill,
  alignItems: 'center' as const,
  backgroundColor: t.colors.primary,
});
