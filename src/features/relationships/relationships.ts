import { createEntry, patchPayload, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ContactPayload } from '@/poles/types';

/** Relations helpers — contacts, interactions, gift ideas. */

export async function addContact(args: { name: string; birthday?: number; notes?: string }) {
  return createEntry({
    poleId: POLE.relationships,
    type: 'contact',
    title: args.name,
    payload: { birthday: args.birthday, notes: args.notes },
  });
}

export async function removeContact(item: Entry) {
  await softDeleteEntry(item);
}

/** Mark that you saw this person now (updates last-seen + logs the interaction). */
export async function logInteraction(contact: Entry) {
  await patchPayload<'contact'>(contact, { lastSeen: Date.now() });
  await createEntry({
    poleId: POLE.relationships,
    type: 'interaction',
    title: contact.title,
    payload: { contactId: contact.id },
  });
}

export async function addGiftIdea(args: { title: string; contactId?: string }) {
  return createEntry({
    poleId: POLE.relationships,
    type: 'gift_idea',
    title: args.title,
    payload: { contactId: args.contactId, bought: false },
  });
}

export async function toggleGiftBought(item: Entry, bought: boolean) {
  await patchPayload<'gift_idea'>(item, { bought });
}

export async function removeGiftIdea(item: Entry) {
  await softDeleteEntry(item);
}

/** Put a contact's birthday into Planning as an event on its next occurrence. */
export async function birthdayToPlanning(contact: Entry) {
  const bday = (contact.payload as ContactPayload).birthday;
  if (!bday) return;
  const b = new Date(bday);
  const now = new Date();
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate(), 9, 0, 0, 0);
  if (next.getTime() < Date.now()) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate(), 9, 0, 0, 0);
  await createEntry({
    poleId: POLE.planning,
    type: 'calendar_event',
    title: `🎂 Anniversaire ${contact.title}`,
    payload: { start: next.getTime(), end: next.getTime() + 3_600_000 },
    occurredAt: next,
  });
}
