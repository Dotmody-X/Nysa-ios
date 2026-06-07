import { create } from 'zustand';

export type LlmState = 'off' | 'downloading' | 'loading' | 'ready' | 'error';

type Store = {
  /** Opt-in: the heavy on-device model only loads when the user enables it. */
  enabled: boolean;
  state: LlmState;
  progress: number; // 0..1 while downloading
  setEnabled: (b: boolean) => void;
  set: (p: Partial<Pick<Store, 'state' | 'progress'>>) => void;
};

/** Lightweight status + opt-in flag for the on-device model. Default OFF so the
 * app never tries to load a multi-GB model unprompted (which can crash the
 * simulator). The user turns it on from the account screen. */
export const useLlmStatus = create<Store>((set) => ({
  enabled: false,
  state: 'off',
  progress: 0,
  setEnabled: (b) => set({ enabled: b, state: b ? 'loading' : 'off', progress: 0 }),
  set: (p) => set(p),
}));
