import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import { Entry } from '../models/Entry';
import type { EntryPayloadMap, EntryType } from '@/poles/types';

const entries = () => database.get<Entry>('entries');

/** Build a query for non-deleted entries of a given type within a pole. */
export function queryEntries(poleId: string, type: EntryType) {
  return entries().query(
    Q.where('pole_id', poleId),
    Q.where('type', type),
    Q.where('deleted_at', null),
    Q.sortBy('occurred_at', Q.desc),
  );
}

/** Entries of a type whose `occurred_at` falls within [start, end). */
export function queryEntriesBetween(poleId: string, type: EntryType, start: number, end: number) {
  return entries().query(
    Q.where('pole_id', poleId),
    Q.where('type', type),
    Q.where('deleted_at', null),
    Q.where('occurred_at', Q.between(start, end)),
    Q.sortBy('occurred_at', Q.asc),
  );
}

/** Create a typed entry. Returns the created record. */
export async function createEntry<T extends EntryType>(args: {
  poleId: string;
  type: T;
  title: string;
  payload: EntryPayloadMap[T];
  occurredAt?: Date;
}): Promise<Entry> {
  return database.write(async () =>
    entries().create((e) => {
      e.poleId = args.poleId;
      e.type = args.type;
      e.title = args.title;
      e.payload = args.payload as Record<string, unknown>;
      e.occurredAt = args.occurredAt ?? new Date();
      e.deletedAt = null;
    }),
  );
}

/** Merge new fields into an entry's payload. */
export async function patchPayload<T extends EntryType>(
  entry: Entry,
  patch: Partial<EntryPayloadMap[T]>,
): Promise<void> {
  await database.write(async () => {
    await entry.update((e) => {
      e.payload = { ...e.payload, ...patch };
    });
  });
}

/** Soft-delete (keeps the row for sync, hides it everywhere). */
export async function softDeleteEntry(entry: Entry): Promise<void> {
  await database.write(async () => {
    await entry.update((e) => {
      e.deletedAt = Date.now();
    });
  });
}
