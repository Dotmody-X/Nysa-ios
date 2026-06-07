import { createEntry, patchPayload, renameEntry, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE } from '@/poles/types';

/** Planning event helpers — manual calendar events you can create and edit. */

export async function addEvent(args: { title: string; start: number; durationMin?: number }) {
  const durationMin = args.durationMin ?? 60;
  return createEntry({
    poleId: POLE.planning,
    type: 'calendar_event',
    title: args.title || 'Événement',
    payload: { start: args.start, end: args.start + durationMin * 60_000 },
    occurredAt: new Date(args.start),
  });
}

export async function updateEvent(entry: Entry, args: { title?: string; start?: number; durationMin?: number }) {
  if (args.title !== undefined) await renameEntry(entry, args.title);
  if (args.start !== undefined) {
    const durationMin = args.durationMin ?? 60;
    await patchPayload<'calendar_event'>(entry, { start: args.start, end: args.start + durationMin * 60_000 });
  }
}

export async function deleteEvent(entry: Entry) {
  await softDeleteEntry(entry);
}
