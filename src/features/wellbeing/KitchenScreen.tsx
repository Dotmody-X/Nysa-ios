import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type RecipePayload } from '@/poles/types';
import {
  addMissingToShopping,
  addPantryItem,
  addRecipe,
  addShoppingItem,
  checkShoppingItem,
  hasIngredient,
  removePantryItem,
  removeRecipe,
  removeShoppingItem,
} from './kitchen';

type Tab = 'courses' | 'placard' | 'recettes';
const TABS: [Tab, string, keyof typeof Ionicons.glyphMap][] = [
  ['courses', 'Courses', 'cart'],
  ['placard', 'Placard', 'file-tray-stacked'],
  ['recettes', 'Recettes', 'restaurant'],
];

export function KitchenScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.wellbeing;
  const [tab, setTab] = useState<Tab>('courses');

  const shopping = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'shopping_item'), [], ['title']);
  const pantry = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'pantry_item'), [], ['title']);
  const recipes = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'recipe'), [], ['title', 'payload']);
  const pantryNames = useMemo(() => pantry.map((p) => p.title), [pantry]);

  const [recipeModal, setRecipeModal] = useState(false);

  return (
    <Screen account={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/wellbeing'))}
        hitSlop={10}
        style={pill(theme, theme.colors.surface, true)}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Cuisine</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Courses, placard et recettes — connectés.
      </Text>

      {/* Segmented control */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(4) }}>
        {TABS.map(([key, label, icon]) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                flexDirection: 'row',
                gap: 6,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: theme.radius.pill,
                backgroundColor: active ? theme.colors.ink : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name={icon} size={16} color={active ? palette.solid : theme.colors.muted} />
              <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: theme.spacing(5), gap: 10 }}>
        {tab === 'courses' ? (
          <>
            <AddRow placeholder="Ajouter aux courses…" onAdd={(t) => addShoppingItem(t)} />
            {shopping.length === 0 ? (
              <Empty text="Liste vide. Tape un article ci-dessus." />
            ) : (
              shopping.map((it) => (
                <Row key={it.id}>
                  <Pressable onPress={() => checkShoppingItem(it)} hitSlop={8}>
                    <Ionicons name="ellipse-outline" size={24} color={theme.colors.muted} />
                  </Pressable>
                  <Text variant="body" style={{ flex: 1 }}>
                    {it.title}
                  </Text>
                  <Pressable onPress={() => removeShoppingItem(it)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={theme.colors.muted} />
                  </Pressable>
                </Row>
              ))
            )}
            {shopping.length > 0 ? (
              <Text variant="caption" color={theme.colors.muted} style={{ marginTop: 4 }}>
                Coche un article : il file dans ton placard.
              </Text>
            ) : null}
          </>
        ) : null}

        {tab === 'placard' ? (
          <>
            <AddRow placeholder="Ajouter au placard…" onAdd={(t) => addPantryItem(t)} />
            {pantry.length === 0 ? (
              <Empty text="Placard vide." />
            ) : (
              pantry.map((it) => (
                <Row key={it.id}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                  <Text variant="body" style={{ flex: 1 }}>
                    {it.title}
                  </Text>
                  <Pressable onPress={() => removePantryItem(it)} hitSlop={8}>
                    <Ionicons name="trash" size={18} color={theme.colors.muted} />
                  </Pressable>
                </Row>
              ))
            )}
          </>
        ) : null}

        {tab === 'recettes' ? (
          <>
            <Pressable onPress={() => setRecipeModal(true)} style={pill(theme, theme.colors.surface)}>
              <Ionicons name="add-circle" size={18} color={palette.solid} />
              <Text variant="label" style={{ marginLeft: 8 }}>
                Nouvelle recette
              </Text>
            </Pressable>

            {recipes.length === 0 ? (
              <Empty text="Aucune recette." />
            ) : (
              recipes.map((r) => {
                const ingredients = (r.payload as RecipePayload).ingredients ?? [];
                const missing = ingredients.filter((i) => !hasIngredient(i, pantryNames));
                return (
                  <View
                    key={r.id}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      padding: theme.spacing(4),
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="body" style={{ flex: 1, fontFamily: theme.fonts.display }}>
                        {r.title}
                      </Text>
                      <Pressable onPress={() => removeRecipe(r)} hitSlop={8}>
                        <Ionicons name="trash" size={16} color={theme.colors.muted} />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {ingredients.map((ing) => {
                        const have = hasIngredient(ing, pantryNames);
                        return (
                          <View
                            key={ing}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Ionicons
                              name={have ? 'checkmark-circle' : 'close-circle'}
                              size={14}
                              color={have ? theme.colors.success : theme.colors.muted}
                            />
                            <Text variant="caption" color={have ? theme.colors.ink : theme.colors.muted}>
                              {ing}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {missing.length > 0 ? (
                      <Pressable
                        onPress={async () => {
                          const n = await addMissingToShopping(ingredients, pantryNames);
                          Alert.alert('Ajouté', `${n} ingrédient(s) manquant(s) ajouté(s) aux courses.`);
                        }}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: 4,
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: theme.radius.pill,
                          backgroundColor: theme.colors.primary,
                        }}
                      >
                        <Text variant="label" color={theme.colors.onPrimary}>
                          + {missing.length} manquant(s) aux courses
                        </Text>
                      </Pressable>
                    ) : (
                      <Text variant="label" color={theme.colors.success}>
                        ✓ Tu as tout pour cuisiner
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : null}
      </View>

      <RecipeModal visible={recipeModal} onClose={() => setRecipeModal(false)} />
    </Screen>
  );
}

function RecipeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    const list = ingredients
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await addRecipe(name.trim(), list);
    setName('');
    setIngredients('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            padding: theme.spacing(6),
            gap: theme.spacing(3),
          }}
        >
          <Text variant="title">Nouvelle recette</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom de la recette"
            placeholderTextColor={theme.colors.muted}
            style={field(theme)}
          />
          <TextInput
            value={ingredients}
            onChangeText={setIngredients}
            placeholder="Ingrédients, séparés par des virgules"
            placeholderTextColor={theme.colors.muted}
            multiline
            style={[field(theme), { minHeight: 80, textAlignVertical: 'top' }]}
          />
          <Pressable
            onPress={submit}
            style={{
              marginTop: theme.spacing(1),
              paddingVertical: 14,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text variant="label" color={theme.colors.onPrimary}>
              Ajouter
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={[field(theme), { flex: 1 }]}
      />
      <Pressable
        onPress={submit}
        style={{
          width: 48,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
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
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const { theme } = useTheme();
  return (
    <Text variant="caption" color={theme.colors.muted} style={{ marginTop: 4 }}>
      {text}
    </Text>
  );
}

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

const pill = (t: ReturnType<typeof useTheme>['theme'], bg: string, square = false) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  alignSelf: 'flex-start' as const,
  backgroundColor: bg,
  borderWidth: 1,
  borderColor: t.colors.border,
  borderRadius: t.radius.pill,
  ...(square
    ? { width: 44, height: 44, marginBottom: t.spacing(4) }
    : { paddingVertical: 12, paddingHorizontal: 18 }),
});
