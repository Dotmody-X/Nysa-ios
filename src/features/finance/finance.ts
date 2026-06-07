import { createEntry, patchPayload, queryEntries, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE } from '@/poles/types';

/** Finance helpers — transactions + a single monthly budget. */

export async function addTransaction(args: { amount: number; kind: 'expense' | 'income'; category: string }) {
  return createEntry({
    poleId: POLE.finance,
    type: 'transaction',
    title: args.category,
    payload: { amount: Math.abs(args.amount), kind: args.kind, category: args.category },
  });
}

export async function removeTransaction(item: Entry) {
  await softDeleteEntry(item);
}

/** Upsert the monthly budget (one per user). */
export async function setBudget(monthly: number) {
  const existing = await queryEntries(POLE.finance, 'budget').fetch();
  if (existing[0]) {
    await patchPayload<'budget'>(existing[0], { monthly });
    return existing[0];
  }
  return createEntry({ poleId: POLE.finance, type: 'budget', title: 'Budget mensuel', payload: { monthly } });
}
