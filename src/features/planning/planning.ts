import { createEntry, patchPayload, renameEntry, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type CalendarEventPayload } from '@/poles/types';
import { DEFAULT_CATEGORY } from './categories';
import { pushDeviceEvent, updateDeviceEvent, deleteDeviceEvent } from './deviceCalendar';

/** Planning event helpers — rich calendar events, mirrored to the device calendar when connected. */

export type EventInput = {
  title: string;
  start: number;
  end?: number;
  durationMin?: number;
  allDay?: boolean;
  category?: string;
  location?: string;
  notes?: string;
};

function buildPayload(args: EventInput): CalendarEventPayload {
  const end = args.allDay
    ? new Date(new Date(args.start).setHours(23, 59, 0, 0)).getTime()
    : args.end ?? args.start + (args.durationMin ?? 60) * 60_000;
  return {
    start: args.start,
    end,
    allDay: !!args.allDay,
    category: args.category ?? DEFAULT_CATEGORY,
    location: args.location?.trim() || undefined,
    notes: args.notes?.trim() || undefined,
  };
}

export async function addEvent(args: EventInput): Promise<Entry> {
  const payload = buildPayload(args);
  const title = args.title?.trim() || 'Événement';
  const entry = await createEntry({
    poleId: POLE.planning,
    type: 'calendar_event',
    title,
    payload,
    occurredAt: new Date(payload.start),
  });
  // Mirror to the native calendar (no-op unless connected).
  pushDeviceEvent(title, payload).then((externalId) => {
    if (externalId) patchPayload<'calendar_event'>(entry, { externalId });
  });
  return entry;
}

export async function updateEvent(entry: Entry, args: Partial<EventInput>): Promise<void> {
  const current = entry.payload as CalendarEventPayload;
  const title = args.title !== undefined ? args.title.trim() || 'Événement' : entry.title;
  if (args.title !== undefined) await renameEntry(entry, title);

  const next = buildPayload({
    title,
    start: args.start ?? current.start,
    end: args.end ?? current.end,
    durationMin: args.durationMin,
    allDay: args.allDay ?? current.allDay,
    category: args.category ?? current.category,
    location: args.location ?? current.location,
    notes: args.notes ?? current.notes,
  });
  await patchPayload<'calendar_event'>(entry, next);
  updateDeviceEvent(current.externalId, title, next);
}

export async function deleteEvent(entry: Entry): Promise<void> {
  const p = entry.payload as CalendarEventPayload;
  deleteDeviceEvent(p.externalId);
  await softDeleteEntry(entry);
}
