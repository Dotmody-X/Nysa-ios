import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'nav_poles';
const DEFAULT: [string, string] = ['work', 'wellbeing'];

type NavPrefs = {
  poles: [string, string]; // the two pole keys shown in the dock
  setPoles: (poles: [string, string]) => void;
  /** Pick a pole into the dock (replaces the older of the two). */
  choose: (key: string) => void;
  load: () => Promise<void>;
};

/** Which two poles sit in the bottom dock. Persisted locally. */
export const useNavPrefs = create<NavPrefs>((set, get) => ({
  poles: DEFAULT,
  setPoles: (poles) => {
    set({ poles });
    SecureStore.setItemAsync(KEY, JSON.stringify(poles)).catch(() => {});
  },
  choose: (key) => {
    const [, b] = get().poles;
    if (get().poles.includes(key)) return;
    get().setPoles([b, key]);
  },
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length === 2) set({ poles: [p[0], p[1]] });
      }
    } catch {
      // keep default
    }
  },
}));
