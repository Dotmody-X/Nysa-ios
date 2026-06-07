import { createEntry, patchPayload, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ChorePayload } from '@/poles/types';

/** Maison (household) helpers — chores, subscriptions, maintenance. */

export async function addChore(name: string) {
  return createEntry({ poleId: POLE.home, type: 'chore', title: name, payload: { done: false } });
}

export async function toggleChore(item: Entry) {
  const done = (item.payload as ChorePayload).done;
  await patchPayload<'chore'>(item, { done: !done });
}

export async function removeChore(item: Entry) {
  await softDeleteEntry(item);
}

export async function addSubscription(name: string, monthlyCost: number) {
  return createEntry({
    poleId: POLE.home,
    type: 'subscription',
    title: name,
    payload: { monthlyCost: Math.abs(monthlyCost) },
  });
}

export async function removeSubscription(item: Entry) {
  await softDeleteEntry(item);
}

export async function addMaintenance(name: string, dueDate?: number, note?: string) {
  return createEntry({
    poleId: POLE.home,
    type: 'maintenance',
    title: name,
    payload: { dueDate, note },
    occurredAt: dueDate ? new Date(dueDate) : undefined,
  });
}

export async function removeMaintenance(item: Entry) {
  await softDeleteEntry(item);
}
