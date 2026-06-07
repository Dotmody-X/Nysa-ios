import { createEntry, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE } from '@/poles/types';

/** Meal planning — assign a recipe to a day + slot (lunch/dinner). */

export async function createMealPlan(args: {
  date: string; // YYYY-MM-DD
  slot: 'lunch' | 'dinner';
  recipeId: string;
  title: string;
}) {
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'meal_plan',
    title: args.title,
    payload: { date: args.date, slot: args.slot, recipeId: args.recipeId },
  });
}

export async function clearMealPlan(entry: Entry) {
  await softDeleteEntry(entry);
}
