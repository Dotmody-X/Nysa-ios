import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type MealPlanPayload, type RecipePayload } from '@/poles/types';
import { startOfWeek } from '@/lib/time';
import { createMealPlan, clearMealPlan } from './mealplan';
import { addMissingToShopping } from './kitchen';

type Slot = 'lunch' | 'dinner';
const SLOTS: [Slot, string][] = [
  ['lunch', 'Midi'],
  ['dinner', 'Soir'],
];

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function MealPlanScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.wellbeing;

  const recipes = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'recipe'), [], ['title', 'payload']);
  const plans = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'meal_plan'), [], ['title', 'payload']);
  const pantry = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'pantry_item'), [], ['title']);

  const weekStart = startOfWeek();
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * 86400000)),
    [weekStart],
  );

  // key `${date}_${slot}` → plan entry
  const planMap = useMemo(() => {
    const m: Record<string, Entry> = {};
    for (const p of plans) {
      const pl = p.payload as MealPlanPayload;
      m[`${pl.date}_${pl.slot}`] = p;
    }
    return m;
  }, [plans]);

  const [picker, setPicker] = useState<{ date: string; slot: Slot } | null>(null);

  const pick = async (recipe: Entry) => {
    if (!picker) return;
    const existing = planMap[`${picker.date}_${picker.slot}`];
    if (existing) await clearMealPlan(existing);
    await createMealPlan({ date: picker.date, slot: picker.slot, recipeId: recipe.id, title: recipe.title });
    setPicker(null);
  };

  const clearSlot = async () => {
    if (!picker) return;
    const existing = planMap[`${picker.date}_${picker.slot}`];
    if (existing) await clearMealPlan(existing);
    setPicker(null);
  };

  const prepareGroceries = async () => {
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    const ingredients: string[] = [];
    for (const p of plans) {
      const pl = p.payload as MealPlanPayload;
      // only this week
      if (!days.some((d) => localIso(d) === pl.date)) continue;
      const r = pl.recipeId ? recipeById.get(pl.recipeId) : undefined;
      if (r) ingredients.push(...((r.payload as RecipePayload).ingredients ?? []));
    }
    if (ingredients.length === 0) {
      Alert.alert('Rien à préparer', 'Planifie des recettes cette semaine d’abord.');
      return;
    }
    const unique = [...new Set(ingredients)];
    const n = await addMissingToShopping(unique, pantry.map((p) => p.title));
    Alert.alert('Courses prêtes', `${n} ingrédient(s) manquant(s) ajouté(s) à ta liste.`);
  };

  return (
    <Screen account={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/wellbeing'))}
        hitSlop={10}
        style={squareBtn(theme)}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Meal planning</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Tes repas de la semaine.
      </Text>

      <Pressable
        onPress={prepareGroceries}
        style={{
          marginTop: theme.spacing(4),
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
        }}
      >
        <Ionicons name="cart" size={18} color={theme.colors.onPrimary} />
        <Text variant="label" color={theme.colors.onPrimary}>
          Préparer les courses de la semaine
        </Text>
      </Pressable>

      <View style={{ marginTop: theme.spacing(5), gap: 10 }}>
        {days.map((d) => {
          const dateKey = localIso(d);
          return (
            <View
              key={dateKey}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing(4),
                gap: 8,
              }}
            >
              <Text variant="label" color={theme.colors.inkSoft}>
                {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SLOTS.map(([slot, label]) => {
                  const plan = planMap[`${dateKey}_${slot}`];
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setPicker({ date: dateKey, slot })}
                      style={{
                        flex: 1,
                        minHeight: 56,
                        borderRadius: theme.radius.sm,
                        backgroundColor: plan ? palette.solid : theme.colors.surfaceAlt,
                        paddingHorizontal: 12,
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="caption" color={plan ? palette.on : theme.colors.muted}>
                        {label}
                      </Text>
                      <Text variant="label" color={plan ? palette.on : theme.colors.ink}>
                        {plan ? plan.title : '+'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Recipe picker */}
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable onPress={() => setPicker(null)} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.colors.bg,
              borderTopLeftRadius: theme.radius.bento,
              borderTopRightRadius: theme.radius.bento,
              padding: theme.spacing(6),
              gap: theme.spacing(2),
            }}
          >
            <Text variant="title">Choisir une recette</Text>
            {recipes.length === 0 ? (
              <Text variant="caption" color={theme.colors.muted}>
                Aucune recette — crées-en dans Cuisine → Recettes.
              </Text>
            ) : (
              recipes.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => pick(r)}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Text variant="body">{r.title}</Text>
                </Pressable>
              ))
            )}
            <Pressable onPress={clearSlot} style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text variant="label" color={theme.colors.danger}>
                Vider ce créneau
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

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
