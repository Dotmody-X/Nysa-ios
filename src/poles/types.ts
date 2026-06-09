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
  finance: 'finance',
  home: 'home',
  relationships: 'relationships',
  learning: 'learning',
  leisure: 'leisure',
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
  /** pantry_item —stockedFrom→ shopping_item (course cochée → rangée) */
  stockedFrom: 'stocked_from',
} as const;
// Note: workouts reuse RELATION.scheduledIn to mirror into Planning.

// ---- Payload shapes -------------------------------------------------------
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type Priority = 'low' | 'med' | 'high' | 'urgent';

export type ProjectPayload = {
  status: ProjectStatus;
  color?: string;
  description?: string;
  groupe?: string; // brand / large category (Le Mixologue, E-Smoker, Interne…)
  priority?: Priority;
  deadline?: number; // epoch ms
  progress?: number; // 0-100 (manual)
  budget?: number; // € target
  rate?: number; // €/h, for billable amount
};

export type TaskPayload = {
  done: boolean;
  projectId?: string;
  priority?: Priority;
  due?: number; // epoch ms (date)
  dueTime?: string; // 'HH:MM'
  category?: string;
  tags?: string[];
  estimatedMin?: number;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  completedAt?: number;
};

export type TimeBlockPayload = {
  durationSec: number;
  source: 'tracker' | 'manual';
  projectId?: string;
  note?: string; // description
  billable?: boolean;
  category?: string;
  startedAt?: number; // epoch ms (for manual/edit)
  endedAt?: number;
};

export type ProjectNotePayload = { projectId: string; content?: string };
export type ProjectFilePayload = { projectId: string; uri: string; size?: number; mime?: string };
export type ProjectLinkPayload = { projectId: string; url: string };

export type CalendarEventPayload = {
  start: number; // epoch ms
  end: number; // epoch ms
  allDay?: boolean;
  category?: string; // category key (see features/planning/categories.ts)
  location?: string;
  notes?: string;
  /** Native device-calendar event id, when mirrored to iCloud/Google. */
  externalId?: string;
};

export type ReminderPayload = {
  at: number; // epoch ms (next fire time)
  repeat: 'once' | 'daily';
  notifId?: string; // scheduled local-notification id (to cancel)
  sound?: string; // 'default' | 'none' | bundled filename (e.g. 'doux.wav')
};

export type HabitPayload = {
  schedule: 'daily';
  icon?: string;
  streak: number;
  /** Optional daily routine grouping (morning / evening checklist). */
  routine?: 'morning' | 'evening';
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

export type MedReminder = { time: string; notifId?: string }; // time = 'HH:MM'
export type MedicationPayload = {
  dosage?: string; // numeric value, e.g. "500"
  unit?: string; // 'mg' | 'pilule' | 'cl' | 'ml' | 'gouttes' | …
  timesPerDay: number; // expected doses per day
  reminders?: MedReminder[]; // scheduled daily notifications
  photoUri?: string; // optional photo of the medication
  note?: string;
};

export type MedIntakePayload = {
  medId: string;
  date: string; // YYYY-MM-DD
};

export type ShoppingItemPayload = {
  qty?: string;
};

export type PantryItemPayload = {
  qty?: string;
};

export type RecipePayload = {
  ingredients: string[];
  steps?: string;
  durationMin?: number;
};

export type PractitionerPayload = {
  specialty?: string;
  phone?: string;
};

export type AppointmentPayload = {
  practitionerId?: string;
  practitionerName?: string;
  start: number; // epoch ms
  durationMin?: number;
  location?: string;
};

/** A health measurement (weight, blood pressure, heart rate…). */
export type MeasurePayload = {
  kind: string; // 'weight' | 'systolic' | 'diastolic' | 'heart_rate' | 'temperature' | custom
  value: number;
  unit?: string;
  note?: string;
};

/** Menstrual cycle — a logged period. Kept out of the AI context by default. */
export type PeriodPayload = {
  start: number; // epoch ms (day the period began)
  end?: number; // epoch ms (day it ended), if known
};

export type MealPlanPayload = {
  date: string; // YYYY-MM-DD
  slot: 'lunch' | 'dinner';
  recipeId?: string;
};

// ---- Finances (Phase 3) ---------------------------------------------------
export type TransactionPayload = {
  amount: number; // positive number; `kind` gives the sign
  kind: 'expense' | 'income';
  category: string;
};

export type BudgetPayload = {
  monthly: number; // monthly spending budget in currency units
};

// ---- Maison (Phase 3) -----------------------------------------------------
export type ChorePayload = {
  done: boolean;
};

export type SubscriptionPayload = {
  monthlyCost: number;
  renewDay?: number; // day of month
};

export type MaintenancePayload = {
  dueDate?: number; // epoch ms
  note?: string;
};

// ---- Relations (Phase 4) --------------------------------------------------
export type ContactPayload = {
  birthday?: number; // epoch ms
  lastSeen?: number; // epoch ms
  notes?: string;
};
export type GiftIdeaPayload = {
  contactId?: string;
  bought: boolean;
};

// ---- Apprentissage (Phase 4) ----------------------------------------------
export type BookPayload = {
  status: 'to-read' | 'reading' | 'read';
  author?: string;
};
export type CoursePayload = {
  progress: number; // 0-100
};
export type NotePayload = {
  content?: string;
};

// ---- Loisirs (Phase 4) ----------------------------------------------------
export type MediaPayload = {
  kind: 'film' | 'série' | 'livre' | 'jeu';
  done: boolean;
  rating?: number;
};
export type WishlistPayload = {
  price?: number;
};
export type BucketPayload = {
  done: boolean;
};

// ---- Type registry --------------------------------------------------------
export type EntryPayloadMap = {
  project: ProjectPayload;
  task: TaskPayload;
  time_block: TimeBlockPayload;
  project_note: ProjectNotePayload;
  project_file: ProjectFilePayload;
  project_link: ProjectLinkPayload;
  calendar_event: CalendarEventPayload;
  habit: HabitPayload;
  habit_check: HabitCheckPayload;
  energy: EnergyPayload;
  reminder: ReminderPayload;
  sleep_log: SleepPayload;
  meal: MealPayload;
  meditation: MeditationPayload;
  mood: MoodPayload;
  workout: WorkoutPayload;
  medication: MedicationPayload;
  med_intake: MedIntakePayload;
  shopping_item: ShoppingItemPayload;
  pantry_item: PantryItemPayload;
  recipe: RecipePayload;
  practitioner: PractitionerPayload;
  appointment: AppointmentPayload;
  measure: MeasurePayload;
  period: PeriodPayload;
  meal_plan: MealPlanPayload;
  transaction: TransactionPayload;
  budget: BudgetPayload;
  chore: ChorePayload;
  subscription: SubscriptionPayload;
  maintenance: MaintenancePayload;
  contact: ContactPayload;
  interaction: { contactId: string };
  gift_idea: GiftIdeaPayload;
  book: BookPayload;
  course: CoursePayload;
  note: NotePayload;
  media: MediaPayload;
  wishlist_item: WishlistPayload;
  bucket_item: BucketPayload;
};

export type EntryType = keyof EntryPayloadMap;

/** Goal metrics tracked so far. */
export const METRIC = {
  focusHours: 'focus_hours_week',
  mindfulMinutes: 'mindful_minutes_week',
  savings: 'savings_total',
} as const;
