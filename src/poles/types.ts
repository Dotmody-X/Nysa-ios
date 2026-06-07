/**
 * Typed entry payloads for the Planning & Work poles (Phase 1).
 *
 * Each entry's `type` determines the shape of its `payload` JSON. Keeping the
 * map here (rather than scattered) means the rest of the app gets compile-time
 * safety when reading/writing payloads, and new types are added in one place.
 */

// ---- Pole ids -------------------------------------------------------------
export const POLE = {
  work: 'work',
  planning: 'planning',
  wellbeing: 'wellbeing',
} as const;

// ---- Relation types (the edges of the graph) ------------------------------
export const RELATION = {
  /** task —belongsTo→ project */
  belongsTo: 'belongs_to',
  /** time_block —tracks→ project */
  tracks: 'tracks',
  /** work time_block —scheduledIn→ planning calendar_event */
  scheduledIn: 'scheduled_in',
  /** energy —reflects→ time_block */
  reflects: 'reflects',
  /** habit_check —checks→ habit */
  checks: 'checks',
} as const;
// Note: workouts reuse RELATION.scheduledIn to mirror into Planning.

// ---- Payload shapes -------------------------------------------------------
export type ProjectPayload = {
  status: 'active' | 'archived';
  color?: string;
  description?: string;
};

export type TaskPayload = {
  done: boolean;
  projectId?: string;
  priority?: 'low' | 'med' | 'high';
  due?: number; // epoch ms
};

export type TimeBlockPayload = {
  durationSec: number;
  source: 'tracker' | 'manual';
  projectId?: string;
  note?: string;
};

export type CalendarEventPayload = {
  start: number; // epoch ms
  end: number; // epoch ms
  allDay?: boolean;
};

export type HabitPayload = {
  schedule: 'daily';
  icon?: string;
  streak: number;
};

export type HabitCheckPayload = {
  habitId: string;
  date: string; // YYYY-MM-DD
};

/** 1–5 self-rating captured right after a focus session. */
export type EnergyPayload = {
  level: 1 | 2 | 3 | 4 | 5;
  focus: 1 | 2 | 3 | 4 | 5;
  note?: string;
};

// ---- Wellbeing (Phase 2) --------------------------------------------------
export type Rating = 1 | 2 | 3 | 4 | 5;
export type Nutriscore = 'A' | 'B' | 'C' | 'D' | 'E';

export type SleepPayload = {
  durationMin: number;
  quality: Rating;
};

export type MealPayload = {
  kind: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories?: number;
  score?: Nutriscore;
};

export type MeditationPayload = {
  durationMin: number;
  kind?: 'calme' | 'respiration' | 'sommeil' | 'focus';
};

export type MoodPayload = {
  level: Rating;
  note?: string;
};

export type WorkoutPayload = {
  activity: string;
  durationMin: number;
  intensity?: Rating;
};

// ---- Type registry --------------------------------------------------------
export type EntryPayloadMap = {
  project: ProjectPayload;
  task: TaskPayload;
  time_block: TimeBlockPayload;
  calendar_event: CalendarEventPayload;
  habit: HabitPayload;
  habit_check: HabitCheckPayload;
  energy: EnergyPayload;
  sleep_log: SleepPayload;
  meal: MealPayload;
  meditation: MeditationPayload;
  mood: MoodPayload;
  workout: WorkoutPayload;
};

export type EntryType = keyof EntryPayloadMap;

/** Goal metrics tracked so far. */
export const METRIC = {
  focusHours: 'focus_hours_week',
  mindfulMinutes: 'mindful_minutes_week',
} as const;
