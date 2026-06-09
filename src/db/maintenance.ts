import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import { Entry } from './models/Entry';

/**
 * Remove duplicate "definition" entries (projects, habits, tasks) that can
 * appear when a fresh local DB re-seeds while cloud sync also restores the
 * previous data. Keeps the earliest of each group, soft-deletes the rest.
 */
const DEDUPE_TYPES = ['project', 'habit', 'task'] as const;

function keyOf(e: Entry): string {
  const title = e.title.trim().toLowerCase();
  if (e.type === 'task') {
    const projectId = (e.payload as { projectId?: string }).projectId ?? '';
    return `task|${title}|${projectId}`;
  }
  return `${e.type}|${title}`;
}

export async function dedupeEntries(): Promise<number> {
  const rows = await database
    .get<Entry>('entries')
    .query(Q.where('type', Q.oneOf([...DEDUPE_TYPES])), Q.where('deleted_at', null))
    .fetch();

  // Keep the earliest-created of each duplicate group.
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const seen = new Set<string>();
  const dups: Entry[] = [];
  for (const e of sorted) {
    const k = keyOf(e);
    if (seen.has(k)) dups.push(e);
    else seen.add(k);
  }

  if (dups.length) {
    await database.write(async () => {
      await database.batch(...dups.map((d) => d.prepareUpdate((x) => (x.deletedAt = Date.now()))));
    });
  }
  return dups.length;
}

// ---- Remove the initial demo / seed data ----------------------------------
const DEMO_PROJECTS = ['App Nysa', 'Client freelance'];
const DEMO_TASKS = ['Maquetter l’écran Travail', 'Brancher le time tracker', 'Envoyer le devis'];
const DEMO_HABITS = ['Méditation', 'Lecture', 'Sport'];

/**
 * Soft-delete the entries created by the old first-launch demo seed (projects,
 * their tasks/time/notes/links/files, the seed tasks and the seed habits +
 * their checks). Lets the user start from a clean slate so screens reflect only
 * their own input.
 */
export async function clearDemoData(): Promise<number> {
  const all = await database.get<Entry>('entries').query(Q.where('deleted_at', null)).fetch();
  const toDelete: Entry[] = [];
  const demoProjectIds = new Set<string>();
  const demoHabitIds = new Set<string>();

  for (const e of all) {
    if (e.type === 'project' && DEMO_PROJECTS.includes(e.title)) {
      toDelete.push(e);
      demoProjectIds.add(e.id);
    } else if (e.type === 'task' && DEMO_TASKS.includes(e.title)) {
      toDelete.push(e);
    } else if (e.type === 'habit' && DEMO_HABITS.includes(e.title)) {
      toDelete.push(e);
      demoHabitIds.add(e.id);
    }
  }
  for (const e of all) {
    if (toDelete.includes(e)) continue;
    const projectId = (e.payload as { projectId?: string }).projectId;
    const habitId = (e.payload as { habitId?: string }).habitId;
    if (projectId && demoProjectIds.has(projectId)) toDelete.push(e);
    else if (habitId && demoHabitIds.has(habitId)) toDelete.push(e);
  }

  if (toDelete.length) {
    await database.write(async () => {
      await database.batch(...toDelete.map((d) => d.prepareUpdate((x) => (x.deletedAt = Date.now()))));
    });
  }
  return toDelete.length;
}
