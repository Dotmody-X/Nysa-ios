import { create } from 'zustand';
import { syncDatabase } from './sync';

type SyncStore = {
  syncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  run: () => Promise<void>;
};

/** Coordinates sync runs + exposes status to the UI. */
export const useSyncStatus = create<SyncStore>((set, get) => ({
  syncing: false,
  lastSyncedAt: null,
  error: null,
  run: async () => {
    if (get().syncing) return;
    set({ syncing: true, error: null });
    try {
      await syncDatabase();
      set({ syncing: false, lastSyncedAt: Date.now() });
    } catch (e) {
      console.warn('[sync] failed', e);
      set({ syncing: false, error: e instanceof Error ? e.message : 'Erreur de synchro' });
    }
  },
}));
