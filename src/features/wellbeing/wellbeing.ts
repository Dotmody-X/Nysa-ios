import { createEntry, queryEntriesBetween, softDeleteEntry } from '@/db/repositories/entries';
import { createLink } from '@/db/repositories/links';
import { bumpGoalByMetric } from '@/db/repositories/goals';
import { startOfDay, endOfDay, isoDate } from '@/lib/time';
import {
  POLE,
  RELATION,
  METRIC,
  type MealPayload,
  type MedIntakePayload,
  type MedicationPayload,
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

export async function addMedication(args: { name: string; dosage?: string; timesPerDay: number }) {
  return createEntry({
    poleId: POLE.wellbeing,
    type: 'medication',
    title: args.name,
    payload: { dosage: args.dosage, timesPerDay: args.timesPerDay },
  });
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
