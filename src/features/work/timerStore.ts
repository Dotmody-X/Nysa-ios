import { create } from 'zustand';

/**
 * Running time-tracker state. Holds *that a session is running, since when, and
 * its context (project / description / billable)*. The elapsed display is
 * derived live in the UI; persistence happens at stop via finishSession().
 */
type TimerState = {
  running: boolean;
  startedAt: number | null;
  projectId?: string;
  projectTitle?: string;
  note?: string;
  billable: boolean;
  start: (p?: { projectId?: string; projectTitle?: string; note?: string; billable?: boolean; startedAt?: number }) => void;
  setNote: (note: string) => void;
  setBillable: (billable: boolean) => void;
  reset: () => void;
};

export const useTimer = create<TimerState>((set) => ({
  running: false,
  startedAt: null,
  projectId: undefined,
  projectTitle: undefined,
  note: undefined,
  billable: false,
  start: (p) =>
    set({
      running: true,
      startedAt: Math.min(p?.startedAt ?? Date.now(), Date.now()),
      projectId: p?.projectId,
      projectTitle: p?.projectTitle,
      note: p?.note,
      billable: p?.billable ?? false,
    }),
  setNote: (note) => set({ note }),
  setBillable: (billable) => set({ billable }),
  reset: () => set({ running: false, startedAt: null, projectId: undefined, projectTitle: undefined, note: undefined, billable: false }),
}));
