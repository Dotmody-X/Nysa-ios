import { Q, type Model } from '@nozbe/watermelondb';
import { database } from '@/db';
import { Entry } from '@/db/models/Entry';
import { Goal } from '@/db/models/Goal';
import { prepareLink } from '@/db/repositories/links';
import { POLE, RELATION, METRIC, type EnergyPayload } from '@/poles/types';

/**
 * ★ The interconnection engine.
 *
 * A single user action (stopping the timer) writes across THREE poles + a goal
 * in one atomic transaction:
 *   1. work     → a `time_block` entry (the tracked session)
 *   2. (link)     time_block —tracks→ project
 *   3. planning → a mirrored `calendar_event` so the session appears on the
 *                 calendar automatically  (time_block —scheduledIn→ event)
 *   4. work     → an `energy` entry from the post-session rating
 *                 (energy —reflects→ time_block)
 *   5. goal     → the weekly focus goal advances by the session duration
 *
 * This is the whole thesis of Nysa made concrete: data entered in one place
 * propagates through the graph instead of living in a silo.
 */
export async function finishSession(args: {
  startedAt: number;
  endedAt: number;
  projectId?: string;
  projectTitle?: string;
  energy?: EnergyPayload;
  note?: string;
  billable?: boolean;
  category?: string;
  source?: 'tracker' | 'manual';
}): Promise<{ durationSec: number }> {
  const { startedAt, endedAt, projectId, projectTitle, energy, note, billable, category, source = 'tracker' } = args;
  const durationSec = Math.max(1, Math.round((endedAt - startedAt) / 1000));

  const entries = database.get<Entry>('entries');

  // Read the focus goal before opening the writer.
  const goalRows = await database
    .get<Goal>('goals')
    .query(Q.where('metric', METRIC.focusHours), Q.where('deleted_at', null), Q.take(1))
    .fetch();
  const goal = goalRows[0];

  await database.write(async () => {
    const label = note?.trim() || (projectTitle ? `Focus · ${projectTitle}` : 'Session de focus');

    // 1. the tracked block (Work)
    const block = entries.prepareCreate((e) => {
      e.poleId = POLE.work;
      e.type = 'time_block';
      e.title = label;
      e.payload = { durationSec, source, projectId, note: note?.trim() || undefined, billable, category, startedAt, endedAt };
      e.occurredAt = new Date(startedAt);
      e.deletedAt = null;
    });

    const ops: Model[] = [block];

    // 2. link to project
    if (projectId) ops.push(prepareLink(block.id, projectId, RELATION.tracks));

    // 3. mirror into Planning
    const planning = entries.prepareCreate((e) => {
      e.poleId = POLE.planning;
      e.type = 'calendar_event';
      e.title = label;
      e.payload = { start: startedAt, end: endedAt, category: category ?? 'work' };
      e.occurredAt = new Date(startedAt);
      e.deletedAt = null;
    });
    ops.push(planning);
    ops.push(prepareLink(block.id, planning.id, RELATION.scheduledIn));

    // 4. energy reflection
    if (energy) {
      const en = entries.prepareCreate((e) => {
        e.poleId = POLE.work;
        e.type = 'energy';
        e.title = 'Énergie & focus';
        e.payload = energy;
        e.occurredAt = new Date(endedAt);
        e.deletedAt = null;
      });
      ops.push(en);
      ops.push(prepareLink(en.id, block.id, RELATION.reflects));
    }

    // 5. advance the weekly focus goal
    if (goal) {
      ops.push(
        goal.prepareUpdate((g) => {
          g.currentValue = g.currentValue + durationSec / 3600;
        }),
      );
    }

    await database.batch(...ops);
  });

  return { durationSec };
}
