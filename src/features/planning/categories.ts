import type { Ionicons } from '@expo/vector-icons';

/**
 * Event categories — kept on-brand (lime / lilac / teal + two neutrals).
 * Each event stores a category KEY; the color is derived here so the palette
 * stays centralized and themeable.
 */
export type EventCategory = {
  key: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const EVENT_CATEGORIES: EventCategory[] = [
  { key: 'general', label: 'Général', color: '#395D6C', icon: 'ellipse' },
  { key: 'work', label: 'Travail', color: '#D6DA2F', icon: 'briefcase' },
  { key: 'perso', label: 'Perso', color: '#D595CF', icon: 'heart' },
  { key: 'sante', label: 'Santé', color: '#5C8597', icon: 'medkit' },
  { key: 'social', label: 'Social', color: '#C76FBE', icon: 'people' },
  { key: 'urgent', label: 'Urgent', color: '#D14B4B', icon: 'alert-circle' },
];

export const DEFAULT_CATEGORY = 'general';

export const categoryOf = (key?: string): EventCategory =>
  EVENT_CATEGORIES.find((c) => c.key === key) ?? EVENT_CATEGORIES[0];

export const categoryColor = (key?: string): string => categoryOf(key).color;
