import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../index';
import { supabase } from '@/lib/supabase';

/**
 * Client-side offline-first sync (no Edge Function needed).
 *
 * Pull: fetch rows changed since `lastPulledAt` (server `updated_at`).
 * Push: upsert local creates/updates straight into the user's tables.
 * RLS guarantees a user only ever touches their own rows.
 *
 * Soft-deletes are modelled as a `deleted_at` column (not WatermelonDB's native
 * destroy), so they travel as normal "updated" rows and the UI filters them out.
 */

const SYNC_TABLES = ['entries', 'links', 'goals', 'tags'] as const;
type SyncTable = (typeof SYNC_TABLES)[number];

// Columns per table (besides `id`). `payload` is JSON in the DB but a string in
// WatermelonDB, so it gets special handling.
const COLUMNS: Record<SyncTable, string[]> = {
  entries: ['pole_id', 'type', 'title', 'payload', 'occurred_at', 'created_at', 'updated_at', 'deleted_at'],
  links: ['from_id', 'to_id', 'relation', 'created_at', 'updated_at', 'deleted_at'],
  goals: [
    'pole_id', 'title', 'target_type', 'metric', 'target_value', 'current_value',
    'unit', 'deadline', 'is_template', 'created_at', 'updated_at', 'deleted_at',
  ],
  tags: ['label', 'color', 'created_at', 'updated_at', 'deleted_at'],
};

const NUMERIC = new Set([
  'occurred_at', 'created_at', 'updated_at', 'deleted_at', 'target_value', 'current_value', 'deadline',
]);

// server row → WatermelonDB raw record
function toLocal(table: SyncTable, row: Record<string, unknown>) {
  const rec: Record<string, unknown> = { id: row.id };
  for (const col of COLUMNS[table]) {
    let v = row[col];
    if (col === 'payload') v = JSON.stringify(v ?? {});
    else if (NUMERIC.has(col) && v != null) v = Number(v);
    rec[col] = v ?? null;
  }
  return rec;
}

// WatermelonDB raw record → server row
function toServer(table: SyncTable, rec: Record<string, unknown>, userId: string) {
  const row: Record<string, unknown> = { id: rec.id, user_id: userId };
  for (const col of COLUMNS[table]) {
    let v = rec[col];
    if (col === 'payload') v = typeof v === 'string' ? JSON.parse((v as string) || '{}') : (v ?? {});
    row[col] = v ?? null;
  }
  row.updated_at = Date.now(); // mark for other devices' delta pulls
  return row;
}

export async function syncDatabase(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return; // not signed in → stay local

  await synchronize({
    database,
    sendCreatedAsUpdated: true,
    pullChanges: async ({ lastPulledAt }) => {
      const since = lastPulledAt ?? 0;
      const timestamp = Date.now();
      const changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }> = {};

      for (const table of SYNC_TABLES) {
        const { data, error } = await supabase.from(table).select('*').gt('updated_at', since);
        if (error) throw error;
        const created: unknown[] = [];
        const updated: unknown[] = [];
        for (const row of (data ?? []) as Record<string, unknown>[]) {
          const rec = toLocal(table, row);
          if (Number(row.created_at ?? 0) > since) created.push(rec);
          else updated.push(rec);
        }
        changes[table] = { created, updated, deleted: [] };
      }
      return { changes, timestamp };
    },
    pushChanges: async ({ changes }) => {
      for (const table of SYNC_TABLES) {
        const tc = changes[table] as
          | { created?: Record<string, unknown>[]; updated?: Record<string, unknown>[]; deleted?: string[] }
          | undefined;
        if (!tc) continue;
        const rows = [...(tc.created ?? []), ...(tc.updated ?? [])].map((rec) => toServer(table, rec, userId));
        if (rows.length) {
          const { error } = await supabase.from(table).upsert(rows);
          if (error) throw error;
        }
        if (tc.deleted?.length) {
          const { error } = await supabase.from(table).delete().in('id', tc.deleted);
          if (error) throw error;
        }
      }
    },
  });
}
