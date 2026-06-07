import { create } from 'zustand';

/**
 * Running time-tracker state. Intentionally tiny: it only holds *that a session
 * is running and since when*. The elapsed display is derived live in the UI,
 * and persistence to the database happens at stop via finishSession().
 */
type TimerState = {
  running: boolean;
  startedAt: number | null;
  projectId?: string;
  projectTitle?: string;
  start: (p?: { projectId?: string; projectTitle?: string }) => void;
  reset: () => void;
};

export const useTimer = create<TimerState>((set) => ({
  running: false,
  startedAt: null,
  projectId: undefined,
  projectTitle: undefined,
  start: (p) =>
    set({ running: true, startedAt: Date.now(), projectId: p?.projectId, projectTitle: p?.projectTitle }),
  reset: () => set({ running: false, startedAt: null, projectId: undefined, projectTitle: undefined }),
}));
