import type { MealPayload, Rating } from '@/poles/types';

/**
 * Local natural-language parser (French) — the v1 brain of the AI copilote.
 *
 * It turns a free sentence into a structured intent the app can act on, e.g.
 *   "médité 10 min"        → { kind: 'meditation', durationMin: 10 }
 *   "dormi 7h30"           → { kind: 'sleep', durationMin: 450 }
 *   "fait du vélo 45 min"  → { kind: 'workout', activity: 'Vélo', durationMin: 45 }
 *   "je me sens super"     → { kind: 'mood', level: 5 }
 *   "déjeuner"             → { kind: 'meal', meal: 'lunch' }
 *   "tâche: envoyer devis" → { kind: 'task', title: 'envoyer devis' }
 *
 * This is intentionally behind the same interface a Claude-powered parser will
 * use (see assist.ts), so swapping in the real model later changes nothing here.
 */

export type ParsedIntent =
  | { kind: 'meditation'; durationMin: number; summary: string }
  | { kind: 'sleep'; durationMin: number; summary: string }
  | { kind: 'workout'; activity: string; durationMin: number; summary: string }
  | { kind: 'mood'; level: Rating; summary: string }
  | { kind: 'meal'; meal: MealPayload['kind']; summary: string }
  | { kind: 'task'; title: string; summary: string };

function extractMinutes(t: string): number | null {
  const hm = t.match(/(\d+)\s*h(?:eures?)?\s*(\d+)?/);
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  const m = t.match(/(\d+)\s*(?:min|minutes?|m)\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}

const WORKOUTS: Record<string, string> = {
  cour: 'Course',
  run: 'Course',
  velo: 'Vélo',
  vélo: 'Vélo',
  muscu: 'Muscu',
  yoga: 'Yoga',
  march: 'Marche',
  nag: 'Natation',
  natation: 'Natation',
};

const MOODS: Array<[RegExp, Rating]> = [
  [/super|génial|genial|excellent|top|au top/, 5],
  [/bien|content|heureux|bonne/, 4],
  [/moyen|bof|normal|ça va|ca va|comme ci/, 3],
  [/mal|fatigué|fatigue|pas bien|triste/, 2],
  [/horrible|épuisé|epuise|déprimé|deprime|nul/, 1],
];

export function parseQuickAdd(input: string): ParsedIntent | null {
  const raw = input.trim();
  if (!raw) return null;
  const t = raw.toLowerCase();
  const minutes = extractMinutes(t);

  // Task (explicit prefix)
  const taskMatch = raw.match(/^(?:t[âa]che|todo|task)\s*[:\-]?\s*(.+)/i);
  if (taskMatch) return { kind: 'task', title: taskMatch[1].trim(), summary: `Tâche · ${taskMatch[1].trim()}` };

  // Meditation
  if (/m[ée]dit/.test(t)) {
    const d = minutes ?? 10;
    return { kind: 'meditation', durationMin: d, summary: `Méditation · ${d} min` };
  }

  // Sleep
  if (/dormi|sommeil|dodo|nuit/.test(t)) {
    const d = minutes ?? 8 * 60;
    return { kind: 'sleep', durationMin: d, summary: `Sommeil · ${Math.round((d / 60) * 10) / 10} h` };
  }

  // Workout
  for (const key of Object.keys(WORKOUTS)) {
    if (t.includes(key)) {
      const d = minutes ?? 30;
      const activity = WORKOUTS[key];
      return { kind: 'workout', activity, durationMin: d, summary: `Sport · ${activity} ${d} min` };
    }
  }
  if (/sport|s[ée]ance|entra[îi]nement/.test(t)) {
    const d = minutes ?? 30;
    return { kind: 'workout', activity: 'Sport', durationMin: d, summary: `Sport · ${d} min` };
  }

  // Meal
  if (/petit[-\s]?d[ée]j|matin/.test(t)) return { kind: 'meal', meal: 'breakfast', summary: 'Repas · Petit-déj' };
  if (/d[ée]jeuner|midi/.test(t)) return { kind: 'meal', meal: 'lunch', summary: 'Repas · Déjeuner' };
  if (/d[îi]ner|soir/.test(t)) return { kind: 'meal', meal: 'dinner', summary: 'Repas · Dîner' };
  if (/encas|snack|go[ûu]ter|collation/.test(t)) return { kind: 'meal', meal: 'snack', summary: 'Repas · Encas' };
  if (/mang[ée]|repas/.test(t)) return { kind: 'meal', meal: 'snack', summary: 'Repas · Encas' };

  // Mood
  if (/humeur|sens|moral/.test(t)) {
    for (const [re, level] of MOODS) if (re.test(t)) return { kind: 'mood', level, summary: `Humeur · ${level}/5` };
    return { kind: 'mood', level: 3, summary: 'Humeur · 3/5' };
  }

  return null;
}
