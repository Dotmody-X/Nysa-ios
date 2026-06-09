import { createEntry, queryEntries, softDeleteEntry } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ReminderPayload } from '@/poles/types';
import { scheduleDaily, scheduleOnceAt, cancelNotification } from '@/lib/notifications';

/** Reminders = a local notification + a tracked entry so they show in the app. */

export async function addReminder(args: { title: string; at: number; repeat: 'once' | 'daily'; sound?: string }) {
  const d = new Date(args.at);
  const notifId =
    args.repeat === 'daily'
      ? await scheduleDaily('Rappel', args.title, d.getHours(), d.getMinutes(), args.sound)
      : await scheduleOnceAt('Rappel', args.title, d, args.sound);

  return createEntry({
    poleId: POLE.planning,
    type: 'reminder',
    title: args.title,
    payload: { at: args.at, repeat: args.repeat, notifId: notifId ?? undefined, sound: args.sound ?? 'default' },
    occurredAt: d,
  });
}

export async function removeReminder(entry: Entry) {
  await cancelNotification((entry.payload as ReminderPayload).notifId);
  await softDeleteEntry(entry);
}

/**
 * Auto-delete one-off reminders whose time has passed — keeps the DB clean.
 * Daily reminders repeat, so they're never pruned. Call on app start / when
 * the reminders screen opens.
 */
export async function prunePastReminders(): Promise<number> {
  const all = await queryEntries(POLE.planning, 'reminder').fetch();
  const now = Date.now();
  let pruned = 0;
  for (const r of all) {
    const p = r.payload as ReminderPayload;
    if (p.repeat === 'once' && p.at <= now) {
      await cancelNotification(p.notifId);
      await softDeleteEntry(r);
      pruned++;
    }
  }
  return pruned;
}
