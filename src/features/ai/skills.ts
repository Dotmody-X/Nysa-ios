import { Q } from '@nozbe/watermelondb';
import { database } from '@/db';
import type { Entry } from '@/db/models/Entry';
import type { Goal } from '@/db/models/Goal';
import { POLE, METRIC } from '@/poles/types';
import { startOfDay, endOfDay, startOfWeek, formatDuration } from '@/lib/time';
import { parseQuickAdd } from './parser';
import { applyIntent } from './assist';

/**
 * The skills engine — the universal, offline, dependency-free brain of the
 * assistant (CADRAGE: "our own AI"). Each skill knows how to recognise an
 * intent and either DO something (write data, navigate) or ANSWER from the
 * user's own data. A language model, when present, will only help phrase the
 * input/output — the capabilities live here and work on every phone.
 */

export type SkillResult = { message: string; navigateTo?: string };
export type Skill = {
  id: string;
  examples: string[];
  match: (text: string, isQuestion: boolean) => boolean;
  run: (text: string) => Promise<SkillResult>;
};

const norm = (s: string) => s.trim().toLowerCase();
const isQuestionText = (t: string) => /combien|quel|quelle|résum|resum|stats?|moyenne|\?|c'est quoi|peux-tu/i.test(t);

// ---- data helpers ---------------------------------------------------------
const entries = () => database.get<Entry>('entries');

async function sumBetween(pole: string, type: string, start: number, end: number, field: string) {
  const rows = await entries()
    .query(Q.where('pole_id', pole), Q.where('type', type), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(start, end)))
    .fetch();
  return rows.reduce((s, r) => s + (Number((r.payload as Record<string, unknown>)[field]) || 0), 0);
}

async function countBetween(pole: string, type: string, start: number, end: number) {
  return entries()
    .query(Q.where('pole_id', pole), Q.where('type', type), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(start, end)))
    .fetchCount();
}

async function goalByMetric(metric: string): Promise<Goal | undefined> {
  const rows = await database
    .get<Goal>('goals')
    .query(Q.where('metric', metric), Q.where('deleted_at', null), Q.take(1))
    .fetch();
  return rows[0];
}

// ---- skills ---------------------------------------------------------------
const NAV: Array<[RegExp, string, string]> = [
  [/accueil|home/, '/home', 'Accueil'],
  [/travail|projet|t[âa]che|boulot/, '/work', 'Travail'],
  [/planning|calendrier|agenda/, '/planning', 'Planning'],
  [/bien|sant[ée]|sommeil|m[ée]dit|humeur|sport/, '/wellbeing', 'Bien-être'],
  [/objectif|goal/, '/goals', 'Objectifs'],
  [/compte|r[ée]glage|profil|param/, '/settings', 'Compte'],
  [/p[ôo]le/, '/poles', 'Pôles'],
];

const skills: Skill[] = [
  // What can you do?
  {
    id: 'help',
    examples: ['que sais-tu faire ?'],
    match: (t) => /que.*(sais|peux).*faire|aide|capacit|comment.*marche/i.test(t),
    run: async () => ({
      message:
        "Je peux : noter tes activités (« médité 10 min », « couru 30 min », « dormi 7h », « tâche: relancer client »), " +
        "répondre sur tes données (« combien j'ai dormi cette semaine », « mon focus aujourd'hui », « habitudes faites »), " +
        'et naviguer (« ouvre le Bien-être »).',
    }),
  },

  // Navigation
  {
    id: 'navigate',
    examples: ['ouvre le bien-être', 'va dans travail'],
    match: (t) => /^(ouvre|va|montre|affiche|emm[èe]ne|navigue)/i.test(t.trim()),
    run: async (t) => {
      const lower = t.toLowerCase();
      for (const [re, route, label] of NAV)
        if (re.test(lower)) return { message: `J'ouvre ${label}.`, navigateTo: route };
      return { message: "Je n'ai pas trouvé cette section." };
    },
  },

  // Queries (only when phrased as a question, so they never clash with logging)
  {
    id: 'q_sleep',
    examples: ["combien j'ai dormi cette semaine"],
    match: (t, q) => q && /dorm|sommeil/.test(t),
    run: async () => {
      const rows = await entries()
        .query(Q.where('pole_id', POLE.wellbeing), Q.where('type', 'sleep_log'), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(startOfWeek(), endOfDay())))
        .fetch();
      if (rows.length === 0) return { message: "Aucune nuit enregistrée cette semaine." };
      const avg = rows.reduce((s, r) => s + (Number((r.payload as Record<string, unknown>).durationMin) || 0), 0) / rows.length;
      return { message: `Cette semaine : ${formatDuration(avg * 60)} de sommeil en moyenne sur ${rows.length} nuit(s).` };
    },
  },
  {
    id: 'q_focus',
    examples: ['mon focus aujourd’hui', 'focus cette semaine'],
    match: (t, q) => (q || /focus|concentr/.test(t)) && /focus|concentr|travaill/.test(t),
    run: async (t) => {
      if (/semaine/i.test(t)) {
        const g = await goalByMetric(METRIC.focusHours);
        const cur = g?.currentValue ?? 0;
        return { message: `Focus de la semaine : ${cur.toFixed(1)} / ${g?.targetValue ?? 20} h.` };
      }
      const sec = await sumBetween(POLE.work, 'time_block', startOfDay(), endOfDay(), 'durationSec');
      return { message: `Focus aujourd'hui : ${formatDuration(sec)}.` };
    },
  },
  {
    id: 'q_habits',
    examples: ['mes habitudes du jour'],
    match: (t, q) => q && /habitude/.test(t),
    run: async () => {
      const total = await entries().query(Q.where('pole_id', POLE.planning), Q.where('type', 'habit'), Q.where('deleted_at', null)).fetchCount();
      const done = await countBetween(POLE.planning, 'habit_check', startOfDay(), endOfDay());
      return { message: `Habitudes aujourd'hui : ${done} / ${total}.` };
    },
  },
  {
    id: 'q_mindful',
    examples: ['mes minutes de calme'],
    match: (t, q) => q && /calme|m[ée]dit/.test(t),
    run: async () => {
      const g = await goalByMetric(METRIC.mindfulMinutes);
      return { message: `Minutes de calme cette semaine : ${(g?.currentValue ?? 0).toFixed(0)} / ${g?.targetValue ?? 70} min.` };
    },
  },

  // Logging — last, only when NOT a question and the parser recognises it.
  {
    id: 'log',
    examples: ['médité 10 min', 'couru 30 min', 'tâche: appeler le client'],
    match: (t, q) => !q && parseQuickAdd(t) !== null,
    run: async (t) => {
      const intent = parseQuickAdd(t);
      if (!intent) return { message: "Je n'ai pas compris." };
      const summary = await applyIntent(intent);
      return { message: `C'est noté · ${summary}.` };
    },
  },
];

/** Route a free sentence to the right skill. Returns the reply (and optional navigation). */
export async function runAssistant(text: string): Promise<SkillResult> {
  const t = norm(text);
  if (!t) return { message: 'Dis-moi ce que tu veux faire 🙂' };
  const q = isQuestionText(t);

  for (const skill of skills) {
    try {
      if (skill.match(t, q)) return await skill.run(text);
    } catch (e) {
      console.warn('[assistant] skill failed', skill.id, e);
    }
  }

  return {
    message:
      "Je n'ai pas encore compris. Essaie par ex. « médité 10 min », « combien j'ai dormi cette semaine » ou « ouvre le Bien-être ».",
  };
}

export const SKILL_EXAMPLES = skills.flatMap((s) => s.examples);
