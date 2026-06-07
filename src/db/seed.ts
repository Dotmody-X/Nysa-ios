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

  // A demo medication to try the tracker.
  await createEntry({
    poleId: POLE.wellbeing,
    type: 'medication',
    title: 'Vitamine D',
    payload: { dosage: '1000 UI', timesPerDay: 1 },
  });

  // Kitchen demo: pantry, shopping list, a recipe.
  for (const name of ['Œufs', 'Pâtes', 'Tomates']) {
    await createEntry({ poleId: POLE.wellbeing, type: 'pantry_item', title: name, payload: {} });
  }
  for (const name of ['Lait', 'Pain']) {
    await createEntry({ poleId: POLE.wellbeing, type: 'shopping_item', title: name, payload: {} });
  }
  await createEntry({
    poleId: POLE.wellbeing,
    type: 'recipe',
    title: 'Pâtes à la tomate',
    payload: { ingredients: ['Pâtes', 'Tomates', 'Parmesan', 'Ail'] },
  });

  // A demo practitioner.
  await createEntry({
    poleId: POLE.wellbeing,
    type: 'practitioner',
    title: 'Dr. Martin',
    payload: { specialty: 'Médecin généraliste' },
  });

  // Finances demo: budget + a couple transactions.
  await createEntry({ poleId: POLE.finance, type: 'budget', title: 'Budget mensuel', payload: { monthly: 1500 } });
  await createEntry({ poleId: POLE.finance, type: 'transaction', title: 'Courses', payload: { amount: 62, kind: 'expense', category: 'Courses' } });
  await createEntry({ poleId: POLE.finance, type: 'transaction', title: 'Salaire', payload: { amount: 2200, kind: 'income', category: 'Salaire' } });
  await createGoal({
    poleId: POLE.finance,
    title: 'Épargne',
    targetType: 'reach',
    metric: METRIC.savings,
    targetValue: 5000,
    unit: '€',
    isTemplate: true,
  });

  // Maison demo: chores, a subscription, a maintenance item.
  for (const name of ['Sortir les poubelles', 'Passer l’aspirateur']) {
    await createEntry({ poleId: POLE.home, type: 'chore', title: name, payload: { done: false } });
  }
  await createEntry({ poleId: POLE.home, type: 'subscription', title: 'Netflix', payload: { monthlyCost: 13.49 } });
  await createEntry({ poleId: POLE.home, type: 'subscription', title: 'Spotify', payload: { monthlyCost: 10.99 } });
  await createEntry({
    poleId: POLE.home,
    type: 'maintenance',
    title: 'Révision chaudière',
    payload: { dueDate: Date.now() + 20 * 86400000, note: 'Annuel' },
  });

  // Relations demo
  await createEntry({
    poleId: POLE.relationships,
    type: 'contact',
    title: 'Léa',
    payload: { lastSeen: Date.now() - 9 * 86400000, birthday: new Date(1996, 4, 12).getTime() },
  });
  await createEntry({ poleId: POLE.relationships, type: 'gift_idea', title: 'Carnet de voyage', payload: { bought: false } });

  // Apprentissage demo
  await createEntry({ poleId: POLE.learning, type: 'book', title: 'Atomic Habits', payload: { status: 'reading', author: 'James Clear' } });
  await createEntry({ poleId: POLE.learning, type: 'course', title: 'React Native avancé', payload: { progress: 40 } });
  await createEntry({ poleId: POLE.learning, type: 'note', title: 'Idée app', payload: { content: 'Penser à la sync offline-first.' } });

  // Loisirs demo
  await createEntry({ poleId: POLE.leisure, type: 'media', title: 'Dune 2', payload: { kind: 'film', done: false } });
  await createEntry({ poleId: POLE.leisure, type: 'wishlist_item', title: 'Casque audio', payload: { price: 199 } });
  await createEntry({ poleId: POLE.leisure, type: 'bucket_item', title: 'Voir une aurore boréale', payload: { done: false } });
}
