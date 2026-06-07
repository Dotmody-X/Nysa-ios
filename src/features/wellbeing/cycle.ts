import { createEntry, patchPayload } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type PeriodPayload } from '@/poles/types';

const DAY = 86_400_000;
const DEFAULT_CYCLE = 28;
const TYPICAL_PERIOD_DAYS = 5;

export async function startPeriod() {
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'period',
    title: 'Règles',
    payload: { start: Date.now() },
  });
}

export async function endPeriod(period: Entry) {
  await patchPayload<'period'>(period, { end: Date.now() });
}

export type CycleInfo = {
  hasData: boolean;
  onPeriod: boolean;
  cycleDay: number;
  avgCycle: number;
  daysUntilNext: number;
  nextStart: number;
  periodDays: Set<string>; // 'YYYY-MM-DD' of logged + predicted period days
};

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Derive cycle stats + the set of period days (logged & predicted) from history. */
export function computeCycle(periods: Entry[]): CycleInfo {
  const sorted = [...periods]
    .map((p) => p.payload as PeriodPayload)
    .sort((a, b) => a.start - b.start);

  const empty: CycleInfo = {
    hasData: false,
    onPeriod: false,
    cycleDay: 0,
    avgCycle: DEFAULT_CYCLE,
    daysUntilNext: 0,
    nextStart: 0,
    periodDays: new Set(),
  };
  if (sorted.length === 0) return empty;

  // Average cycle length from consecutive starts.
  let avgCycle = DEFAULT_CYCLE;
  if (sorted.length >= 2) {
    let sum = 0;
    for (let i = 1; i < sorted.length; i++) sum += (sorted[i].start - sorted[i - 1].start) / DAY;
    avgCycle = Math.round(sum / (sorted.length - 1));
    if (avgCycle < 15 || avgCycle > 60) avgCycle = DEFAULT_CYCLE;
  }

  const last = sorted[sorted.length - 1];
  const now = Date.now();
  const cycleDay = Math.floor((now - last.start) / DAY) + 1;
  const onPeriod = !last.end && now - last.start < TYPICAL_PERIOD_DAYS * DAY;
  const nextStart = last.start + avgCycle * DAY;
  const daysUntilNext = Math.ceil((nextStart - now) / DAY);

  // Build the set of period days: each logged period (start..end or +typical),
  // plus the next predicted period window.
  const periodDays = new Set<string>();
  for (const p of sorted) {
    const end = p.end ?? p.start + (TYPICAL_PERIOD_DAYS - 1) * DAY;
    for (let t = p.start; t <= end; t += DAY) periodDays.add(iso(t));
  }
  for (let i = 0; i < TYPICAL_PERIOD_DAYS; i++) periodDays.add(iso(nextStart + i * DAY));

  return { hasData: true, onPeriod, cycleDay, avgCycle, daysUntilNext, nextStart, periodDays };
}
