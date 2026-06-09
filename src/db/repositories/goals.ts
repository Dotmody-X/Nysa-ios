import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import { Goal } from '../models/Goal';
import type { GoalTargetType } from '../models/Goal';

const goals = () => database.get<Goal>('goals');

export function queryGoals(poleId?: string) {
  const clauses = [Q.where('deleted_at', null)];
  if (poleId) clauses.unshift(Q.where('pole_id', poleId));
  return goals().query(...clauses);
}

export function queryGoalByMetric(metric: string) {
  return goals().query(Q.where('metric', metric), Q.where('deleted_at', null), Q.take(1));
}

export async function createGoal(args: {
  poleId: string;
  title: string;
  targetType: GoalTargetType;
  metric: string;
  targetValue?: number;
  unit?: string;
  isTemplate?: boolean;
}): Promise<Goal> {
  return database.write(async () =>
    goals().create((g) => {
      g.poleId = args.poleId;
      g.title = args.title;
      g.targetType = args.targetType;
      g.metric = args.metric;
      g.targetValue = args.targetValue ?? null;
      g.currentValue = 0;
      g.unit = args.unit ?? null;
      g.deadline = null;
      g.isTemplate = args.isTemplate ?? false;
      g.deletedAt = null;
    }),
  );
}

/** Edit a goal's editable fields. */
export async function updateGoal(
  goal: Goal,
  patch: Partial<{ title: string; targetValue: number | null; unit: string | null; currentValue: number }>,
): Promise<void> {
  await database.write(async () => {
    await goal.update((g) => {
      if (patch.title !== undefined) g.title = patch.title;
      if (patch.targetValue !== undefined) g.targetValue = patch.targetValue;
      if (patch.unit !== undefined) g.unit = patch.unit;
      if (patch.currentValue !== undefined) g.currentValue = patch.currentValue;
    });
  });
}

export async function deleteGoal(goal: Goal): Promise<void> {
  await database.write(async () => {
    await goal.update((g) => {
      g.deletedAt = Date.now();
    });
  });
}

/** Increment a goal's progress by metric. Safe no-op if the goal doesn't exist. */
export async function bumpGoalByMetric(metric: string, delta: number): Promise<void> {
  const found = await goals()
    .query(Q.where('metric', metric), Q.where('deleted_at', null), Q.take(1))
    .fetch();
  const goal = found[0];
  if (!goal) return;
  await database.write(async () => {
    await goal.update((g) => {
      g.currentValue = g.currentValue + delta;
    });
  });
}
