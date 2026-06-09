import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

/**
 * Project "groupes" (brands / large categories) with an optional hourly rate.
 * Managed from the account screen, persisted locally. Projects reference a
 * groupe by name; the rate drives the billable amount.
 */
export type Groupe = { id: string; name: string; rate?: number };

const KEY = 'work_groupes';
const DEFAULTS: Groupe[] = [
  { id: 'g1', name: 'Le Mixologue' },
  { id: 'g2', name: 'E-Smoker' },
  { id: 'g3', name: 'Aeterna' },
  { id: 'g4', name: 'Interne' },
  { id: 'g5', name: 'Autre' },
];

type GroupesStore = {
  groupes: Groupe[];
  load: () => Promise<void>;
  add: (name?: string) => void;
  update: (id: string, patch: Partial<Omit<Groupe, 'id'>>) => void;
  remove: (id: string) => void;
};

function persist(groupes: Groupe[]) {
  SecureStore.setItemAsync(KEY, JSON.stringify(groupes)).catch(() => {});
}

export const useGroupes = create<GroupesStore>((set, get) => ({
  groupes: DEFAULTS,
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const g = JSON.parse(raw);
        if (Array.isArray(g)) set({ groupes: g });
      }
    } catch {
      // keep defaults
    }
  },
  add: (name = 'Nouveau groupe') => {
    const next = [...get().groupes, { id: `${Date.now()}`, name }];
    set({ groupes: next });
    persist(next);
  },
  update: (id, patch) => {
    const next = get().groupes.map((g) => (g.id === id ? { ...g, ...patch } : g));
    set({ groupes: next });
    persist(next);
  },
  remove: (id) => {
    const next = get().groupes.filter((g) => g.id !== id);
    set({ groupes: next });
    persist(next);
  },
}));

/** Hourly rate for a groupe name, or undefined. */
export function rateForGroupe(name?: string): number | undefined {
  if (!name) return undefined;
  return useGroupes.getState().groupes.find((g) => g.name === name)?.rate;
}
