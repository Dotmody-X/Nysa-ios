import { createEntry, softDeleteEntry } from '@/db/repositories/entries';
import { createLink } from '@/db/repositories/links';
import type { Entry } from '@/db/models/Entry';
import { POLE, RELATION, type ShoppingItemPayload } from '@/poles/types';

/**
 * Kitchen loop (CADRAGE signature interconnection):
 *   Courses  → (cocher) → Placard  → (recettes lisent le placard) → manquants → Courses
 * Everything is plain Entries in the wellbeing pole, linked via the graph.
 */

// ---- Courses --------------------------------------------------------------
export async function addShoppingItem(name: string, qty?: string) {
  return createEntry({ poleId: POLE.wellbeing, type: 'shopping_item', title: name, payload: { qty } });
}

export async function removeShoppingItem(item: Entry) {
  await softDeleteEntry(item);
}

/** Tick off a shopping item → it moves into the pantry (and we keep the link). */
export async function checkShoppingItem(item: Entry) {
  const qty = (item.payload as ShoppingItemPayload).qty;
  const pantry = await createEntry({
    poleId: POLE.wellbeing,
    type: 'pantry_item',
    title: item.title,
    payload: { qty },
  });
  await createLink(pantry.id, item.id, RELATION.stockedFrom);
  await softDeleteEntry(item);
}

// ---- Placard --------------------------------------------------------------
export async function addPantryItem(name: string, qty?: string) {
  return createEntry({ poleId: POLE.wellbeing, type: 'pantry_item', title: name, payload: { qty } });
}

export async function removePantryItem(item: Entry) {
  await softDeleteEntry(item);
}

// ---- Recettes -------------------------------------------------------------
export async function addRecipe(name: string, ingredients: string[]) {
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'recipe',
    title: name,
    payload: { ingredients },
  });
}

export async function removeRecipe(item: Entry) {
  await softDeleteEntry(item);
}

/** True if an ingredient is covered by something in the pantry (loose match). */
export function hasIngredient(ingredient: string, pantryNames: string[]): boolean {
  const ing = ingredient.trim().toLowerCase();
  return pantryNames.some((p) => {
    const name = p.toLowerCase();
    return name.includes(ing) || ing.includes(name);
  });
}

/** Add every missing ingredient of a recipe to the shopping list. Returns count added. */
export async function addMissingToShopping(ingredients: string[], pantryNames: string[]): Promise<number> {
  const missing = ingredients.filter((i) => !hasIngredient(i, pantryNames));
  for (const name of missing) await addShoppingItem(name);
  return missing.length;
}
