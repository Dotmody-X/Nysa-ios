import { Q } from '@nozbe/watermelondb';
import { database } from '@/db';
import type { Entry } from '@/db/models/Entry';
import { POLE, METRIC, type SubscriptionPayload, type AppointmentPayload, type BookPayload, type TransactionPayload, type ContactPayload } from '@/poles/types';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, formatDuration } from '@/lib/time';
import { parseQuickAdd } from './parser';
import { applyIntent } from './assist';
import { llmReady, rewriteToCommand } from './llm';
// feature actions the assistant can perform
import { addShoppingItem, addPantryItem } from '@/features/wellbeing/kitchen';
import { logMedIntake } from '@/features/wellbeing/wellbeing';
import { addTransaction } from '@/features/finance/finance';
import { addBook, addNote } from '@/features/learning/learning';
import { addWishlist, addBucket } from '@/features/leisure/leisure';
import { logInteraction } from '@/features/relationships/relationships';

/**
 * The skills engine — the universal, offline, dependency-free brain of the
 * assistant. Each skill recognises an intent and either DOES something (writes
 * data across any pole, navigates) or ANSWERS from the user's own data.
 */

export type SkillResult = { message: string; navigateTo?: string };
export type Skill = {
  id: string;
  examples: string[];
  match: (text: string, isQuestion: boolean) => boolean;
  run: (text: string) => Promise<SkillResult>;
};

const norm = (s: string) => s.trim().toLowerCase();
const isQuestionText = (t: string) => /combien|quel|quelle|résum|resum|stats?|moyenne|\?|c'est quoi|quand|où|ou est|peux-tu/i.test(t);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const entries = () => database.get<Entry>('entries');

async function fetchAll(pole: string, type: string): Promise<Entry[]> {
  return entries().query(Q.where('pole_id', pole), Q.where('type', type), Q.where('deleted_at', null)).fetch();
}
async function findByName(pole: string, type: string, name: string): Promise<Entry | undefined> {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const rows = await fetchAll(pole, type);
  return rows.find((r) => {
    const t = r.title.toLowerCase();
    return t.includes(n) || n.includes(t);
  });
}
async function sumBetween(pole: string, type: string, start: number, end: number, field: string) {
  const rows = await entries()
    .query(Q.where('pole_id', pole), Q.where('type', type), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(start, end)))
    .fetch();
  return rows.reduce((s, r) => s + (Number((r.payload as Record<string, unknown>)[field]) || 0), 0);
}
async function countBetween(pole: string, type: string, start: number, end: number) {
  return entries().query(Q.where('pole_id', pole), Q.where('type', type), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(start, end))).fetchCount();
}
async function goalCurrent(metric: string): Promise<{ cur: number; target?: number } | null> {
  const rows = await database.get('goals').query(Q.where('metric', metric), Q.where('deleted_at', null), Q.take(1)).fetch();
  const g = rows[0] as unknown as { currentValue: number; targetValue?: number } | undefined;
  return g ? { cur: g.currentValue, target: g.targetValue } : null;
}

const eur = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
const num = (t: string): number | null => {
  const m = t.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
};
const after = (t: string, re: RegExp): string => {
  const m = t.match(re);
  return m ? m[1].trim() : '';
};

const NAV: Array<[RegExp, string, string]> = [
  [/accueil|home/, '/home', 'Accueil'],
  [/travail|projet|t[âa]che|boulot/, '/work', 'Travail'],
  [/planning|calendrier|agenda/, '/planning', 'Planning'],
  [/bien|sant[ée]|sommeil|m[ée]dit|humeur|sport/, '/wellbeing', 'Bien-être'],
  [/finance|argent|budget|d[ée]pense/, '/finance', 'Finances'],
  [/maison|m[ée]nage|abonnement|entretien/, '/household', 'Maison'],
  [/relation|contact|ami|cadeau/, '/relationships', 'Relations'],
  [/apprentissage|livre|cours|note|cerveau/, '/learning', 'Apprentissage'],
  [/loisir|film|s[ée]rie|wishlist|bucket|envie/, '/leisure', 'Loisirs'],
  [/objectif|goal/, '/goals', 'Objectifs'],
  [/compte|r[ée]glage|profil|param/, '/settings', 'Compte'],
  [/p[ôo]le/, '/poles', 'Pôles'],
];

const skills: Skill[] = [
  {
    id: 'help',
    examples: ['que sais-tu faire ?'],
    match: (t) => /que.*(sais|peux).*faire|aide|capacit|comment.*marche/i.test(t),
    run: async () => ({
      message:
        'Je peux agir : « ajoute du lait aux courses », « dépensé 12€ au resto », « j\'ai pris ma vitamine D », « j\'ai vu Léa », ' +
        '« ajoute le livre Dune », « note: idée géniale », « médité 10 min ». ' +
        'Et répondre : « combien j\'ai dépensé ce mois », « mon prochain rdv », « combien j\'ai dormi cette semaine ». ' +
        'Ou naviguer : « ouvre les finances ».',
    }),
  },

  {
    id: 'navigate',
    examples: ['ouvre le bien-être'],
    match: (t) => /^(ouvre|va|montre|affiche|emm[èe]ne|navigue)/i.test(t.trim()),
    run: async (t) => {
      const lower = t.toLowerCase();
      for (const [re, route, label] of NAV) if (re.test(lower)) return { message: `J'ouvre ${label}.`, navigateTo: route };
      return { message: "Je n'ai pas trouvé cette section." };
    },
  },

  // ---------- QUERIES (only when phrased as a question) ----------
  {
    id: 'q_spending',
    examples: ["combien j'ai dépensé ce mois"],
    match: (t, q) => q && /d[ée]pens|budget/.test(t),
    run: async () => {
      const rows = await entries()
        .query(Q.where('pole_id', POLE.finance), Q.where('type', 'transaction'), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(startOfMonth(), endOfMonth())))
        .fetch();
      const exp = rows
        .filter((r) => (r.payload as TransactionPayload).kind === 'expense')
        .reduce((s, r) => s + (r.payload as TransactionPayload).amount, 0);
      const budgetRows = await fetchAll(POLE.finance, 'budget');
      const budget = budgetRows[0] ? (budgetRows[0].payload as { monthly: number }).monthly : null;
      return { message: `Tu as dépensé ${eur(exp)} ce mois-ci${budget ? ` (budget : ${eur(budget)}).` : '.'}` };
    },
  },
  {
    id: 'q_subscriptions',
    examples: ['mes abonnements'],
    match: (t, q) => q && /abonnement/.test(t),
    run: async () => {
      const subs = await fetchAll(POLE.home, 'subscription');
      const total = subs.reduce((s, r) => s + ((r.payload as SubscriptionPayload).monthlyCost || 0), 0);
      return { message: subs.length ? `${subs.length} abonnement(s) pour ${eur(total)} / mois.` : "Aucun abonnement enregistré." };
    },
  },
  {
    id: 'q_next_rdv',
    examples: ['mon prochain rdv'],
    match: (t, q) => q && /(rdv|rendez-vous)/.test(t),
    run: async () => {
      const appts = await fetchAll(POLE.wellbeing, 'appointment');
      const next = appts.map((a) => a.payload as AppointmentPayload).filter((p) => p.start >= Date.now()).sort((a, b) => a.start - b.start)[0];
      if (!next) return { message: 'Aucun rendez-vous à venir.' };
      return { message: `Prochain RDV : ${next.practitionerName ?? 'rendez-vous'}, le ${new Date(next.start).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.` };
    },
  },
  {
    id: 'q_books',
    examples: ['mes lectures en cours'],
    match: (t, q) => q && /livre|lecture|lis/.test(t),
    run: async () => {
      const books = await fetchAll(POLE.learning, 'book');
      const reading = books.filter((b) => (b.payload as BookPayload).status === 'reading').map((b) => b.title);
      return { message: reading.length ? `En cours de lecture : ${reading.join(', ')}.` : "Tu n'as aucun livre en cours." };
    },
  },
  {
    id: 'q_sleep',
    examples: ["combien j'ai dormi cette semaine"],
    match: (t, q) => q && /dorm|sommeil/.test(t),
    run: async () => {
      const rows = await entries().query(Q.where('pole_id', POLE.wellbeing), Q.where('type', 'sleep_log'), Q.where('deleted_at', null), Q.where('occurred_at', Q.between(startOfWeek(), endOfDay()))).fetch();
      if (rows.length === 0) return { message: 'Aucune nuit enregistrée cette semaine.' };
      const avg = rows.reduce((s, r) => s + (Number((r.payload as Record<string, unknown>).durationMin) || 0), 0) / rows.length;
      return { message: `Cette semaine : ${formatDuration(avg * 60)} de sommeil en moyenne sur ${rows.length} nuit(s).` };
    },
  },
  {
    id: 'q_focus',
    examples: ['mon focus aujourd’hui'],
    match: (t, q) => (q || /focus/.test(t)) && /focus|concentr|travaill/.test(t),
    run: async (t) => {
      if (/semaine/i.test(t)) {
        const g = await goalCurrent(METRIC.focusHours);
        return { message: `Focus de la semaine : ${(g?.cur ?? 0).toFixed(1)} / ${g?.target ?? 20} h.` };
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
    id: 'q_lastseen',
    examples: ['quand ai-je vu Léa ?'],
    match: (t, q) => q && /vu|derni[èe]re fois/.test(t),
    run: async (t) => {
      const name = after(t, /(?:vu|revu)\s+([a-zà-ÿ\- ]+)\??$/i);
      const c = name ? await findByName(POLE.relationships, 'contact', name) : undefined;
      if (!c) return { message: 'Je ne trouve pas ce contact.' };
      const ls = (c.payload as ContactPayload).lastSeen;
      if (!ls) return { message: `Tu n'as encore jamais noté avoir vu ${c.title}.` };
      const d = Math.floor((Date.now() - ls) / 86_400_000);
      return { message: `Tu as vu ${c.title} il y a ${d} jour(s).` };
    },
  },

  // ---------- ACTIONS (not questions) ----------
  {
    id: 'add_shopping',
    examples: ['ajoute du lait aux courses'],
    match: (t, q) => !q && /(aux courses|à la liste|sur la liste de course)/.test(t),
    run: async (t) => {
      const item = after(t, /ajoute(?:r)?\s+(?:du |de la |des |de l'|un |une |le |la |les )?(.+?)\s+(?:aux courses|à la liste|sur la liste)/i) || after(t, /(.+?)\s+aux courses/i);
      if (!item) return { message: "Qu'est-ce que j'ajoute aux courses ?" };
      await addShoppingItem(cap(item));
      return { message: `Ajouté aux courses : ${cap(item)}.` };
    },
  },
  {
    id: 'add_pantry',
    examples: ['ajoute des œufs au placard'],
    match: (t, q) => !q && /(au placard|à l'inventaire|dans le placard)/.test(t),
    run: async (t) => {
      const item = after(t, /ajoute(?:r)?\s+(?:du |de la |des |de l'|un |une |le |la |les )?(.+?)\s+(?:au placard|dans le placard|à l'inventaire)/i);
      if (!item) return { message: "Qu'est-ce que j'ajoute au placard ?" };
      await addPantryItem(cap(item));
      return { message: `Rangé au placard : ${cap(item)}.` };
    },
  },
  {
    id: 'add_expense',
    examples: ['dépensé 12€ au resto'],
    match: (t, q) => !q && /(d[ée]pens|pay[ée]|achat|achet[ée]|re[çc]u|gagn[ée])/.test(t) && num(t) !== null,
    run: async (t) => {
      const amount = num(t)!;
      const income = /(re[çc]u|gagn[ée]|encaiss[ée]|salaire)/.test(t);
      const cat = after(t, /(?:au|à|a|en|pour|chez|sur)\s+([a-zà-ÿ' \-]{2,})$/i);
      const category = cat ? cap(cat) : income ? 'Revenu' : 'Divers';
      await addTransaction({ amount, kind: income ? 'income' : 'expense', category });
      return { message: `${income ? 'Entrée' : 'Dépense'} enregistrée : ${eur(amount)} · ${category}.` };
    },
  },
  {
    id: 'med_intake',
    examples: ["j'ai pris ma vitamine D"],
    match: (t, q) => !q && /(j'ai pris|pris)\s+(mon|ma|mes|le|la|du|de la)?/.test(t),
    run: async (t) => {
      const name = after(t, /pris\s+(?:mon|ma|mes|le|la|du|de la|des)?\s*(.+)/i);
      const med = name ? await findByName(POLE.wellbeing, 'medication', name) : undefined;
      if (!med) return { message: `Je ne trouve pas ce médicament dans ton suivi.` };
      await logMedIntake(med.id);
      return { message: `Prise notée : ${med.title}.` };
    },
  },
  {
    id: 'log_interaction',
    examples: ["j'ai vu Léa"],
    match: (t, q) => !q && /(j'ai vu|rencontr[ée]|appel[ée]|parl[ée] à)\s+/.test(t),
    run: async (t) => {
      const name = after(t, /(?:j'ai vu|revu|rencontr[ée]|appel[ée]|parl[ée] à)\s+([a-zà-ÿ\- ]+)$/i);
      const c = name ? await findByName(POLE.relationships, 'contact', name) : undefined;
      if (!c) return { message: name ? `Je ne connais pas « ${cap(name)} » dans tes contacts. Ajoute-le dans Relations.` : 'Qui as-tu vu ?' };
      await logInteraction(c);
      return { message: `Noté : tu as vu ${c.title} aujourd'hui.` };
    },
  },
  {
    id: 'add_book',
    examples: ['ajoute le livre Dune'],
    match: (t, q) => !q && /(ajoute|rajoute).*livre|(?:je veux|j'aimerais)\s+lire/.test(t),
    run: async (t) => {
      const title = after(t, /livre\s+(.+)/i) || after(t, /lire\s+(.+)/i);
      if (!title) return { message: "Quel livre veux-tu ajouter ?" };
      await addBook({ title: cap(title) });
      return { message: `Ajouté à ta liste de lecture : ${cap(title)}.` };
    },
  },
  {
    id: 'add_wishlist',
    examples: ['ajoute un casque à ma wishlist'],
    match: (t, q) => !q && /wishlist|liste d'envie/.test(t),
    run: async (t) => {
      const item = after(t, /ajoute(?:r)?\s+(?:un |une |le |la |des )?(.+?)\s+(?:à|a|dans)\s+(?:ma\s+)?wishlist/i);
      if (!item) return { message: "Qu'est-ce que tu veux ajouter à ta wishlist ?" };
      await addWishlist({ title: cap(item) });
      return { message: `Ajouté à ta wishlist : ${cap(item)}.` };
    },
  },
  {
    id: 'add_bucket',
    examples: ['ajoute voir une aurore à ma bucket list'],
    match: (t, q) => !q && /bucket|je r[êe]ve de/.test(t),
    run: async (t) => {
      const item = after(t, /(?:bucket(?: list)?|je r[êe]ve de)\s*[:\-]?\s*(.+)/i) || after(t, /ajoute\s+(.+?)\s+(?:à|a|dans)\s+(?:ma\s+)?bucket/i);
      if (!item) return { message: "Quel rêve veux-tu ajouter ?" };
      await addBucket(cap(item));
      return { message: `Ajouté à ta bucket list : ${cap(item)}.` };
    },
  },
  {
    id: 'add_note',
    examples: ['note: penser à la sync'],
    match: (t, q) => !q && /^note\s*[:\-]/.test(t),
    run: async (t) => {
      const content = after(t, /^note\s*[:\-]\s*(.+)/i);
      if (!content) return { message: "Quelle note veux-tu garder ?" };
      const title = content.length > 40 ? content.slice(0, 40) + '…' : content;
      await addNote({ title, content });
      return { message: `Note enregistrée dans ton second cerveau.` };
    },
  },

  // ---------- Logging fallback (parser: meditation, sleep, workout, mood, meal, task) ----------
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

/** Run the deterministic engine on a sentence. Returns null if nothing matched. */
async function runSkills(text: string): Promise<SkillResult | null> {
  const t = norm(text);
  if (!t) return null;
  const q = isQuestionText(t);
  for (const skill of skills) {
    try {
      if (skill.match(t, q)) return await skill.run(text);
    } catch (e) {
      console.warn('[assistant] skill failed', skill.id, e);
    }
  }
  return null;
}

export async function runAssistant(text: string): Promise<SkillResult> {
  if (!norm(text)) return { message: 'Dis-moi ce que tu veux faire 🙂' };

  // Layer 1 — deterministic, instant, offline.
  const direct = await runSkills(text);
  if (direct) return direct;

  // Layer 2 (optional) — if an on-device model is loaded, let it rewrite the
  // free sentence into a supported command, then run Layer 1 on the result.
  if (llmReady()) {
    const rewritten = await rewriteToCommand(text, GRAMMAR);
    if (rewritten && norm(rewritten) !== norm(text)) {
      const viaLlm = await runSkills(rewritten);
      if (viaLlm) return viaLlm;
    }
  }

  return {
    message:
      "Je n'ai pas encore compris. Essaie « ajoute du lait aux courses », « dépensé 12€ au resto », « combien j'ai dormi cette semaine » ou « ouvre le Bien-être ».",
  };
}

export const SKILL_EXAMPLES = [
  'ajoute du lait aux courses',
  'dépensé 12€ au resto',
  "j'ai pris ma vitamine D",
  "combien j'ai dormi cette semaine",
  'mon prochain rdv',
  'ouvre les finances',
];

/** The full command grammar the Layer-2 model should rewrite free text into. */
export const GRAMMAR = [
  'ajoute <article> aux courses',
  'ajoute <article> au placard',
  'dépensé <montant>€ <catégorie>',
  'reçu <montant>€ <source>',
  "j'ai pris <médicament>",
  "j'ai vu <prénom>",
  'ajoute le livre <titre>',
  'ajoute <objet> à ma wishlist',
  'je rêve de <objectif>',
  'note: <texte>',
  'médité <minutes> min',
  'couru <minutes> min',
  'dormi <heures>h',
  'tâche: <intitulé>',
  'ouvre <pôle>',
  "combien j'ai dépensé ce mois",
  'mon prochain rdv',
  "combien j'ai dormi cette semaine",
  'mes abonnements',
];
