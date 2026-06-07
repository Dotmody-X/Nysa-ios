import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../index';
import { supabase } from '@/lib/supabase';

/**
 * Offline-first sync (skeleton — see CADRAGE.md §2).
 *
 * Strategy: WatermelonDB pushes local changes and pulls remote deltas using
 * `last_pulled_at` timestamps, so only what changed since the last sync moves
 * over the wire. The actual server logic lives in a Supabase Edge Function
 * (`sync`) that this calls — kept server-side so RLS and conflict resolution
 * are authoritative.
 *
 * This function is intentionally NOT called automatically. Trigger it on:
 *   - app foreground
 *   - connectivity restored
 *   - manual pull-to-refresh
 *
 * The Edge Function + Postgres tables are built in Phase 0.5; until then this
 * is a no-op-safe stub that logs and returns.
 */
export async function syncDatabase(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    // Not signed in yet — stay fully local. No error.
    return;
  }

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { data, error } = await supabase.functions.invoke('sync', {
        body: { action: 'pull', lastPulledAt },
      });
      if (error) throw error;
      return { changes: data.changes, timestamp: data.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const { error } = await supabase.functions.invoke('sync', {
        body: { action: 'push', changes, lastPulledAt },
      });
      if (error) throw error;
    },
    // Soft-deletes use the `deleted_at` column rather than hard deletes.
    sendCreatedAsUpdated: true,
  });
}
