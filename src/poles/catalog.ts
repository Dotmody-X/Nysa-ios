import type { Ionicons } from '@expo/vector-icons';

/** Single source of truth for the 8 poles: route, tab name, label, icon. */
export type PoleMeta = {
  key: string; // matches theme.poleColors[key]
  name: string; // (tabs) route screen name → navigation.navigate(name)
  route: string; // router.push path
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const POLE_CATALOG: PoleMeta[] = [
  { key: 'planning', name: 'planning', route: '/planning', label: 'Planning', icon: 'calendar' },
  { key: 'work', name: 'work', route: '/work', label: 'Travail', icon: 'briefcase' },
  { key: 'wellbeing', name: 'wellbeing', route: '/wellbeing', label: 'Bien-être', icon: 'heart' },
  { key: 'finance', name: 'finance', route: '/finance', label: 'Finances', icon: 'wallet' },
  { key: 'home', name: 'household', route: '/household', label: 'Maison', icon: 'home' },
  { key: 'relationships', name: 'relationships', route: '/relationships', label: 'Relations', icon: 'people' },
  { key: 'learning', name: 'learning', route: '/learning', label: 'Apprentissage', icon: 'book' },
  { key: 'leisure', name: 'leisure', route: '/leisure', label: 'Loisirs', icon: 'game-controller' },
];

export const poleByKey = (key: string) => POLE_CATALOG.find((p) => p.key === key);
