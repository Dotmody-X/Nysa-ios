/**
 * The pole registry — the master map of Nysa's domains and their sub-poles.
 *
 * Every pole is a self-contained module (CADRAGE.md §3). This registry is the
 * one place that knows they all exist; the UI builds itself from it, so adding
 * a pole later means adding an entry here, not rewiring screens.
 *
 * `accent` references a theme color key, never a raw hex, so poles re-skin
 * automatically with the active theme.
 */

export type PoleAccent = 'primary' | 'secondary' | 'accent';

export type SubPole = {
  key: string;
  label: string;
  /** Phase in which this sub-pole is built (see roadmap). */
  phase: 0 | 1 | 2 | 3 | 4 | 5;
};

export type Pole = {
  key: string;
  label: string;
  tagline: string;
  accent: PoleAccent;
  phase: 0 | 1 | 2 | 3 | 4 | 5;
  subPoles: SubPole[];
};

export const POLES: Pole[] = [
  {
    key: 'planning',
    label: 'Planning',
    tagline: 'Le temps, maîtrisé',
    accent: 'accent',
    phase: 1,
    subPoles: [
      { key: 'calendar', label: 'Calendrier', phase: 1 },
      { key: 'reminders', label: 'Rappels', phase: 1 },
      { key: 'habits', label: 'Habit tracker', phase: 1 },
      { key: 'routines', label: 'Routine quotidienne', phase: 2 },
    ],
  },
  {
    key: 'work',
    label: 'Travail',
    tagline: 'Projets & focus',
    accent: 'primary',
    phase: 1,
    subPoles: [
      { key: 'projects', label: 'Projets', phase: 1 },
      { key: 'todos', label: 'To-do list', phase: 1 },
      { key: 'time', label: 'Time tracker', phase: 1 },
      { key: 'energy', label: 'Énergie & focus', phase: 1 },
      { key: 'moodboard', label: 'Moodboard', phase: 5 },
      { key: 'knowledge', label: 'Knowledge perso', phase: 4 },
      { key: 'reviews', label: 'Revue hebdo / mensuelle', phase: 2 },
      { key: 'archive', label: 'Archives projets', phase: 5 },
    ],
  },
  {
    key: 'wellbeing',
    label: 'Bien-être',
    tagline: 'Corps & esprit',
    accent: 'secondary',
    phase: 2,
    subPoles: [
      { key: 'nutrition', label: 'Nutrition', phase: 2 },
      { key: 'recipes', label: 'Recettes', phase: 3 },
      { key: 'groceries', label: 'Courses', phase: 3 },
      { key: 'pantry', label: 'Inventaire placard', phase: 3 },
      { key: 'meal-planning', label: 'Meal planning', phase: 3 },
      { key: 'sleep', label: 'Sommeil', phase: 2 },
      { key: 'habits', label: 'Habit tracker', phase: 2 },
      { key: 'meditation', label: 'Méditation / routines', phase: 2 },
      { key: 'health', label: 'Santé médicale', phase: 4 },
      { key: 'meds', label: 'Médicaments', phase: 4 },
      { key: 'practitioners', label: 'Médecins / psy', phase: 4 },
      { key: 'cycle', label: 'Cycle menstruel', phase: 4 },
    ],
  },
  {
    key: 'finance',
    label: 'Finances',
    tagline: 'Argent & patrimoine',
    accent: 'accent',
    phase: 3,
    subPoles: [
      { key: 'budget', label: 'Budgétisation', phase: 3 },
      { key: 'tracking', label: 'Suivi des finances', phase: 3 },
      { key: 'markets', label: 'Bourse / crypto', phase: 5 },
      { key: 'networth', label: 'Patrimoine', phase: 3 },
      { key: 'goals', label: 'Objectifs financiers', phase: 3 },
      { key: 'taxes', label: 'Taxes / impôts', phase: 5 },
    ],
  },
  {
    key: 'home',
    label: 'Maison',
    tagline: 'Le foyer, organisé',
    accent: 'primary',
    phase: 3,
    subPoles: [
      { key: 'maintenance', label: 'Entretien / maintenance', phase: 3 },
      { key: 'chores', label: 'Tâches ménagères', phase: 3 },
      { key: 'admin', label: 'Documents admin', phase: 3 },
      { key: 'subscriptions', label: 'Abonnements', phase: 3 },
      { key: 'wardrobe', label: 'Garde-robe', phase: 5 },
    ],
  },
  {
    key: 'learning',
    label: 'Apprentissage',
    tagline: 'Grandir, chaque jour',
    accent: 'secondary',
    phase: 4,
    subPoles: [
      { key: 'books', label: 'Livres', phase: 4 },
      { key: 'courses', label: 'Cours en ligne', phase: 4 },
      { key: 'second-brain', label: 'Second cerveau', phase: 4 },
    ],
  },
  {
    key: 'relationships',
    label: 'Relations',
    tagline: 'Les gens qui comptent',
    accent: 'secondary',
    phase: 4,
    subPoles: [
      { key: 'contacts', label: 'Contacts', phase: 4 },
      { key: 'interactions', label: 'Suivi des interactions', phase: 4 },
      { key: 'gifts', label: 'Idées cadeaux', phase: 4 },
      { key: 'events', label: 'Événements familiaux', phase: 4 },
    ],
  },
  {
    key: 'leisure',
    label: 'Loisirs',
    tagline: 'Le plaisir, suivi',
    accent: 'primary',
    phase: 4,
    subPoles: [
      { key: 'wishlist', label: 'Wishlist', phase: 4 },
      { key: 'collections', label: 'Collections', phase: 4 },
      { key: 'creative', label: 'Projets créatifs', phase: 4 },
      { key: 'media', label: 'Films / séries / livres', phase: 4 },
      { key: 'bucketlist', label: 'Bucket list', phase: 4 },
    ],
  },
];

export const getPole = (key: string) => POLES.find((p) => p.key === key);
