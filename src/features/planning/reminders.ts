import { createEntry, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ReminderPayload } from '@/poles/types';
import { scheduleDaily, scheduleOnceAt, cancelNotification } from '@/lib/notifications';

/** Reminders = a local notification + a tracked entry so they show in the app. */

export async function addReminder(args: { title: string; at: number; repeat: 'once' | 'daily' }) {
  const d = new Date(args.at);
  const notifId =
    args.repeat === 'daily'
      ? await scheduleDaily('Rappel', args.title, d.getHours(), d.getMinutes())
      : await scheduleOnceAt('Rappel', args.title, d);

  return createEntry({
    poleId: POLE.planning,
    type: 'reminder',
    title: args.title,
    payload: { at: args.at, repeat: args.repeat, notifId: notifId ?? undefined },
    occurredAt: d,
  });
}

export async function removeReminder(entry: Entry) {
  await cancelNotification((entry.payload as ReminderPayload).notifId);
  await softDeleteEntry(entry);
}
