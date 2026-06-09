import { createEntry, queryEntries, queryEntriesBetween, patchPayload, renameEntry, softDeleteEntry } from '@/db/repositories/entries';
import { createLink } from '@/db/repositories/links';
import { bumpGoalByMetric } from '@/db/repositories/goals';
import { scheduleDaily, cancelNotification } from '@/lib/notifications';
import { startOfDay, endOfDay, isoDate } from '@/lib/time';
import type { Entry } from '@/db/models/Entry';
import {
  POLE,
  RELATION,
  METRIC,
  type MealPayload,
  type MeasurePayload,
  type MedIntakePayload,
  type MedicationPayload,
  type MedReminder,
  type MeditationPayload,
  type MoodPayload,
  type SleepPayload,
  type WorkoutPayload,
} from '@/poles/types';

/** Wellbeing log helpers. Each writes a typed entry; some propagate across poles. */

export async function logSleep(payload: SleepPayload) {
  return createEntry({ poleId: POLE.wellbeing, type: 'sleep_log', title: 'Sommeil', payload });
}

export async function logMeal(payload: MealPayload) {
  const labels = { breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Encas' };
  return createEntry({ poleId: POLE.wellbeing, type: 'meal', title: labels[payload.kind], payload });
}

// ---- Health measures (weight, blood pressure…) ----------------------------
export const MEASURE_TYPES: { kind: string; label: string; unit: string; icon: string }[] = [
  { kind: 'weight', label: 'Poids', unit: 'kg', icon: 'scale' },
  { kind: 'systolic', label: 'Tension (sys.)', unit: 'mmHg', icon: 'pulse' },
  { kind: 'diastolic', label: 'Tension (dia.)', unit: 'mmHg', icon: 'pulse' },
  { kind: 'heart_rate', label: 'Fréq. cardiaque', unit: 'bpm', icon: 'heart' },
  { kind: 'temperature', label: 'Température', unit: '°C', icon: 'thermometer' },
];

export const queryMeasures = () => queryEntries(POLE.wellbeing, 'measure');

export async function logMeasure(kind: string, value: number, unit?: string, note?: string) {
  const meta = MEASURE_TYPES.find((m) => m.kind === kind);
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'measure',
    title: meta?.label ?? kind,
    payload: { kind, value, unit: unit ?? meta?.unit, note } satisfies MeasurePayload,
  });
}

export async function deleteMeasure(entry: Entry) {
  await softDeleteEntry(entry);
}

export async function logMood(payload: MoodPayload) {
  return createEntry({ poleId: POLE.wellbeing, type: 'mood', title: 'Humeur', payload });
}

/** Meditation feeds the weekly "mindful minutes" goal — a cross-pole objective. */
export async function logMeditation(payload: MeditationPayload) {
  const entry = await createEntry({
    poleId: POLE.wellbeing,
    type: 'meditation',
    title: 'Méditation',
    payload,
  });
  await bumpGoalByMetric(METRIC.mindfulMinutes, payload.durationMin);
  return entry;
}

/**
 * A workout mirrors itself into Planning as a calendar event — exactly like a
 * work focus session does. Same interconnection pattern, different pole.
 */
export async function logWorkout(payload: WorkoutPayload) {
  const now = Date.now();
  const start = now - payload.durationMin * 60_000;

  const workout = await createEntry({
    poleId: POLE.wellbeing,
    type: 'workout',
    title: `Sport · ${payload.activity}`,
    payload,
    occurredAt: new Date(start),
  });

  const event = await createEntry({
    poleId: POLE.planning,
    type: 'calendar_event',
    title: `Sport · ${payload.activity}`,
    payload: { start, end: now },
    occurredAt: new Date(start),
  });

  await createLink(workout.id, event.id, RELATION.scheduledIn);
  return workout;
}

// ---- Medications ----------------------------------------------------------

export const MED_UNITS = ['mg', 'g', 'pilule', 'gélule', 'cl', 'ml', 'gouttes', 'sachet', 'unité'];

type MedInput = {
  name: string;
  dosage?: string;
  unit?: string;
  timesPerDay: number;
  reminderTimes?: string[]; // ['08:00', '20:00']
  photoUri?: string;
};

async function buildReminders(name: string, times: string[]): Promise<MedReminder[]> {
  const out: MedReminder[] = [];
  for (const t of times) {
    const [h, m] = t.split(':').map(Number);
    const notifId = await scheduleDaily('Médicament', `C'est l'heure de prendre ${name}`, h, m);
    out.push({ time: t, notifId: notifId ?? undefined });
  }
  return out;
}
async function cancelReminders(reminders?: MedReminder[]) {
  for (const r of reminders ?? []) await cancelNotification(r.notifId);
}

export async function addMedication(args: MedInput) {
  const reminders = args.reminderTimes?.length ? await buildReminders(args.name, args.reminderTimes) : undefined;
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'medication',
    title: args.name,
    payload: {
      dosage: args.dosage,
      unit: args.unit,
      timesPerDay: args.timesPerDay,
      reminders,
      photoUri: args.photoUri,
    },
  });
}

/** Edit a medication; reschedules its reminders from `reminderTimes`. */
export async function updateMedication(entry: Entry, args: MedInput) {
  if (args.name && args.name !== entry.title) await renameEntry(entry, args.name);
  const cur = entry.payload as MedicationPayload;
  await cancelReminders(cur.reminders);
  const reminders = args.reminderTimes?.length ? await buildReminders(args.name || entry.title, args.reminderTimes) : undefined;
  await patchPayload<'medication'>(entry, {
    dosage: args.dosage,
    unit: args.unit,
    timesPerDay: args.timesPerDay,
    reminders,
    photoUri: args.photoUri,
  });
}

export async function removeMedication(entry: Entry) {
  await cancelReminders((entry.payload as MedicationPayload).reminders);
  await softDeleteEntry(entry);
}

/** Record one dose taken today for a medication. */
export async function logMedIntake(medId: string) {
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'med_intake',
    title: 'Prise',
    payload: { medId, date: isoDate() },
  });
}

/** Undo the most recent dose logged today for a medication. */
export async function removeLastMedIntake(medId: string) {
  const todays = await queryEntriesBetween(POLE.wellbeing, 'med_intake', startOfDay(), endOfDay()).fetch();
  const forMed = todays
    .filter((e) => (e.payload as MedIntakePayload).medId === medId)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  if (forMed[0]) await softDeleteEntry(forMed[0]);
}

export type { MedicationPayload };
