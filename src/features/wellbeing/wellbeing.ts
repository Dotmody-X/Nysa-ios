import { createEntry } from '@/db/repositories/entries';
import { createLink } from '@/db/repositories/links';
import { bumpGoalByMetric } from '@/db/repositories/goals';
import {
  POLE,
  RELATION,
  METRIC,
  type MealPayload,
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
