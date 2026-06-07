import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import { Entry } from './models/Entry';
import { createEntry } from './repositories/entries';
import { createLink } from './repositories/links';
import { createGoal } from './repositories/goals';
import { POLE, RELATION, METRIC } from '@/poles/types';

/**
 * One-time demo data so Phase 1 is explorable on first launch.
 * Idempotent: bails out if any project already exists.
 */
export async function seedIfEmpty(): Promise<void> {
  const projectCount = await database
    .get<Entry>('entries')
    .query(Q.where('type', 'project'), Q.where('deleted_at', null))
    .fetchCount();

  if (projectCount > 0) return;

  // Projects
  const nysa = await createEntry({
    poleId: POLE.work,
    type: 'project',
    title: 'App Nysa',
    payload: { status: 'active', color: '#D6DA2F' },
  });
  const freelance = await createEntry({
    poleId: POLE.work,
    type: 'project',
    title: 'Client freelance',
    payload: { status: 'active', color: '#D595CF' },
  });

  // Tasks linked to projects
  const tasks: Array<[string, string]> = [
    ['Maquetter l’écran Travail', nysa.id],
    ['Brancher le time tracker', nysa.id],
    ['Envoyer le devis', freelance.id],
  ];
  for (const [title, projectId] of tasks) {
    const task = await createEntry({
      poleId: POLE.work,
      type: 'task',
      title,
      payload: { done: false, projectId },
    });
    await createLink(task.id, projectId, RELATION.belongsTo);
  }

  // Habits (Planning)
  for (const [title, icon] of [
    ['Méditation', 'leaf'],
    ['Lecture', 'book'],
    ['Sport', 'barbell'],
  ] as const) {
    await createEntry({
      poleId: POLE.planning,
      type: 'habit',
      title,
      payload: { schedule: 'daily', streak: 0, icon },
    });
  }

  // The cross-pole goal that the time tracker feeds.
  await createGoal({
    poleId: POLE.work,
    title: 'Focus de la semaine',
    targetType: 'reach',
    metric: METRIC.focusHours,
    targetValue: 20,
    unit: 'h',
    isTemplate: true,
  });

  // Wellbeing demo: a night of sleep, a mood, a meal.
  await createEntry({
    poleId: POLE.wellbeing,
    type: 'sleep_log',
    title: 'Sommeil',
    payload: { durationMin: 437, quality: 4 },
  });
  await createEntry({
    poleId: POLE.wellbeing,
    type: 'mood',
    title: 'Humeur',
    payload: { level: 4 },
  });
  await createEntry({
    poleId: POLE.wellbeing,
    type: 'meal',
    title: 'Déjeuner',
    payload: { kind: 'lunch', calories: 620, score: 'B' },
  });

  // The wellbeing goal that meditation feeds.
  await createGoal({
    poleId: POLE.wellbeing,
    title: 'Minutes de calme',
    targetType: 'reach',
    metric: METRIC.mindfulMinutes,
    targetValue: 70,
    unit: 'min',
    isTemplate: true,
  });
}
