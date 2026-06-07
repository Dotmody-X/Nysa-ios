import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Entry } from './models/Entry';
import { Link } from './models/Link';
import { Goal } from './models/Goal';
import { Tag } from './models/Tag';

/**
 * Local-first database. This is the app's source of truth — every read and
 * write hits SQLite first and the UI observes it reactively. Cloud sync
 * (see ./sync/sync.ts) reconciles in the background.
 *
 * `jsi: true` uses the new-architecture JSI bridge for synchronous, fast
 * native calls. Migrations are intentionally omitted at v1; add a
 * `migrations` object here once the schema evolves past version 1.
 */
const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[db] failed to set up WatermelonDB', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Entry, Link, Goal, Tag],
});

export { Entry, Link, Goal, Tag };
