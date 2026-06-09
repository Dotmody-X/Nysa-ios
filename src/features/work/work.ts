import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { createEntry, patchPayload, renameEntry, softDeleteEntry, queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import {
  POLE,
  type ProjectPayload,
  type ProjectStatus,
  type Priority,
  type TaskPayload,
  type TimeBlockPayload,
  type ProjectNotePayload,
  type ProjectFilePayload,
  type ProjectLinkPayload,
} from '@/poles/types';

// ---- Constants (on-brand) -------------------------------------------------
export const PROJECT_COLORS = ['#395D6C', '#D6DA2F', '#D595CF', '#8A8D85'];
export const GROUPE_SUGGESTIONS = ['Le Mixologue', 'E-Smoker', 'Aeterna', 'Interne', 'Autre'];

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Basse', color: '#8A8D85' },
  med: { label: 'Moyenne', color: '#395D6C' },
  high: { label: 'Haute', color: '#AEB223' },
  urgent: { label: 'Urgente', color: '#D14B4B' },
};

export const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'Actif', color: '#D6DA2F' },
  paused: { label: 'En pause', color: '#8A8D85' },
  completed: { label: 'Terminé', color: '#3FA34D' },
  archived: { label: 'Archivé', color: '#8A8D85' },
};

// ---- Queries --------------------------------------------------------------
export const queryProjects = () => queryEntries(POLE.work, 'project');
export const queryTasks = () => queryEntries(POLE.work, 'task');
export const queryTimeBlocks = () => queryEntries(POLE.work, 'time_block');
export const queryProjectNotes = () => queryEntries(POLE.work, 'project_note');
export const queryProjectFiles = () => queryEntries(POLE.work, 'project_file');
export const queryProjectLinks = () => queryEntries(POLE.work, 'project_link');
export const queryEnergy = () => queryEntries(POLE.work, 'energy');

// ---- Projects -------------------------------------------------------------
export type ProjectInput = {
  title: string;
  groupe?: string;
  color?: string;
  description?: string;
  priority?: Priority;
  deadline?: number;
  budget?: number;
  rate?: number;
  progress?: number;
  status?: ProjectStatus;
};

export async function createProject(args: ProjectInput): Promise<Entry> {
  const payload: ProjectPayload = {
    status: args.status ?? 'active',
    color: args.color ?? PROJECT_COLORS[0],
    description: args.description?.trim() || undefined,
    groupe: args.groupe?.trim() || undefined,
    priority: args.priority ?? 'med',
    deadline: args.deadline,
    budget: args.budget,
    rate: args.rate,
    progress: args.progress ?? 0,
  };
  return createEntry({ poleId: POLE.work, type: 'project', title: args.title.trim() || 'Projet', payload });
}

export async function updateProject(entry: Entry, args: Partial<ProjectInput>): Promise<void> {
  if (args.title !== undefined) await renameEntry(entry, args.title.trim() || 'Projet');
  const patch: Partial<ProjectPayload> = {};
  for (const k of ['status', 'color', 'description', 'groupe', 'priority', 'deadline', 'budget', 'rate', 'progress'] as const) {
    if (args[k] !== undefined) (patch as Record<string, unknown>)[k] = args[k];
  }
  if (Object.keys(patch).length) await patchPayload<'project'>(entry, patch);
}

export async function setProjectStatus(entry: Entry, status: ProjectStatus): Promise<void> {
  await patchPayload<'project'>(entry, { status });
}

/** Soft-delete a project and its tasks, notes and files. Time blocks stay for history. */
export async function deleteProject(entry: Entry): Promise<void> {
  const id = entry.id;
  for (const q of [queryTasks(), queryProjectNotes(), queryProjectFiles(), queryProjectLinks()]) {
    const rows = await q.fetch();
    for (const r of rows) {
      if ((r.payload as { projectId?: string }).projectId === id) await softDeleteEntry(r);
    }
  }
  await softDeleteEntry(entry);
}

// ---- Tasks ----------------------------------------------------------------
export type TaskInput = {
  title: string;
  projectId?: string;
  priority?: Priority;
  due?: number;
  dueTime?: string;
  category?: string;
  tags?: string[];
  estimatedMin?: number;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
};

export async function createTask(args: TaskInput): Promise<Entry> {
  const payload: TaskPayload = {
    done: false,
    projectId: args.projectId,
    priority: args.priority ?? 'med',
    due: args.due,
    dueTime: args.dueTime,
    category: args.category?.trim() || undefined,
    tags: args.tags?.length ? args.tags : undefined,
    estimatedMin: args.estimatedMin,
    recurrence: args.recurrence ?? 'none',
  };
  return createEntry({
    poleId: POLE.work,
    type: 'task',
    title: args.title.trim() || 'Tâche',
    payload,
    occurredAt: args.due ? new Date(args.due) : new Date(),
  });
}

export async function updateTask(entry: Entry, args: Partial<TaskInput>): Promise<void> {
  if (args.title !== undefined) await renameEntry(entry, args.title.trim() || 'Tâche');
  const patch: Partial<TaskPayload> = {};
  for (const k of ['projectId', 'priority', 'due', 'dueTime', 'category', 'tags', 'estimatedMin', 'recurrence'] as const) {
    if (args[k] !== undefined) (patch as Record<string, unknown>)[k] = args[k];
  }
  if (Object.keys(patch).length) await patchPayload<'task'>(entry, patch);
}

const RECUR_MS = { daily: 86_400_000, weekly: 7 * 86_400_000, monthly: 30 * 86_400_000 } as const;

/** Toggle done. Completing a recurring task spawns the next occurrence. */
export async function toggleTask(entry: Entry): Promise<void> {
  const p = entry.payload as TaskPayload;
  if (!p.done) {
    if (p.recurrence && p.recurrence !== 'none') {
      const step = RECUR_MS[p.recurrence];
      const base = p.due ?? Date.now();
      await createTask({
        title: entry.title,
        projectId: p.projectId,
        priority: p.priority,
        due: base + step,
        dueTime: p.dueTime,
        category: p.category,
        tags: p.tags,
        estimatedMin: p.estimatedMin,
        recurrence: p.recurrence,
      });
    }
    await patchPayload<'task'>(entry, { done: true, completedAt: Date.now() });
  } else {
    await patchPayload<'task'>(entry, { done: false, completedAt: undefined });
  }
}

export async function deleteTask(entry: Entry): Promise<void> {
  await softDeleteEntry(entry);
}

// ---- Time blocks (manual + edit) ------------------------------------------
export async function updateTimeBlock(
  entry: Entry,
  patch: Partial<Pick<TimeBlockPayload, 'note' | 'projectId' | 'billable' | 'category' | 'startedAt' | 'endedAt'>>,
): Promise<void> {
  const cur = entry.payload as TimeBlockPayload;
  const startedAt = patch.startedAt ?? cur.startedAt ?? entry.occurredAt.getTime();
  const endedAt = patch.endedAt ?? cur.endedAt;
  const next: Partial<TimeBlockPayload> = { ...patch };
  if (endedAt) next.durationSec = Math.max(1, Math.round((endedAt - startedAt) / 1000));
  await patchPayload<'time_block'>(entry, next);
  if (patch.note !== undefined) await renameEntry(entry, patch.note.trim() || entry.title);
}

export async function deleteTimeBlock(entry: Entry): Promise<void> {
  await softDeleteEntry(entry);
}

// ---- Project notes --------------------------------------------------------
export async function createNote(projectId: string, title: string, content: string): Promise<Entry> {
  return createEntry({
    poleId: POLE.work,
    type: 'project_note',
    title: title.trim() || 'Note',
    payload: { projectId, content: content.trim() || undefined } satisfies ProjectNotePayload,
  });
}
export async function updateNote(entry: Entry, args: { title?: string; content?: string }): Promise<void> {
  if (args.title !== undefined) await renameEntry(entry, args.title.trim() || 'Note');
  if (args.content !== undefined) await patchPayload<'project_note'>(entry, { content: args.content.trim() || undefined });
}
export async function deleteNote(entry: Entry): Promise<void> {
  await softDeleteEntry(entry);
}

// ---- Project links (knowledge) --------------------------------------------
function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export async function addLink(projectId: string, url: string): Promise<Entry | null> {
  const u = normalizeUrl(url);
  if (!u) return null;
  return createEntry({
    poleId: POLE.work,
    type: 'project_link',
    title: u.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    payload: { projectId, url: u } satisfies ProjectLinkPayload,
  });
}
export async function deleteLink(entry: Entry): Promise<void> {
  await softDeleteEntry(entry);
}

// ---- Project files (local, via document picker) ---------------------------
const FILES_DIR = FileSystem.documentDirectory + 'project_files/';

export async function pickAndAddFile(projectId: string): Promise<Entry | null> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  let uri = asset.uri;
  try {
    await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true });
    const dest = FILES_DIR + `${Date.now()}-${asset.name}`;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    uri = dest;
  } catch {
    // fall back to the cache uri
  }
  const payload: ProjectFilePayload = { projectId, uri, size: asset.size ?? undefined, mime: asset.mimeType };
  return createEntry({ poleId: POLE.work, type: 'project_file', title: asset.name, payload });
}

export async function deleteFile(entry: Entry): Promise<void> {
  const uri = (entry.payload as ProjectFilePayload).uri;
  if (uri?.startsWith(FILES_DIR)) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }
  await softDeleteEntry(entry);
}

// ---- Helpers --------------------------------------------------------------
/** Billable amount for a project (sum of billable time × rate). */
export function billableAmount(blocks: Entry[], projectId: string, rate?: number): number {
  if (!rate) return 0;
  const sec = blocks
    .filter((b) => {
      const p = b.payload as TimeBlockPayload;
      return p.projectId === projectId && p.billable;
    })
    .reduce((s, b) => s + ((b.payload as TimeBlockPayload).durationSec ?? 0), 0);
  return (sec / 3600) * rate;
}
