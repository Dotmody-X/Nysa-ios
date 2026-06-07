import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * The universal data model (see CADRAGE.md §4).
 *
 * Instead of one table per tracker, every piece of data is an `entry`,
 * every relationship is a `link`, and cross-pole objectives are `goals`.
 * This is what makes poles interconnect without schema churn: a new pole
 * just introduces new `type` values + payload shapes, no migration.
 */
export const schema = appSchema({
  version: 1,
  tables: [
    // The atomic unit of data across ALL poles.
    tableSchema({
      name: 'entries',
      columns: [
        { name: 'pole_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true }, // e.g. 'expense', 'workout', 'task'
        { name: 'title', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON, type-specific fields
        { name: 'occurred_at', type: 'number', isIndexed: true }, // when the thing happened
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true }, // soft-delete for sync
      ],
    }),
    // The relationship between two entries (or entry <-> goal). The heart of Nysa.
    tableSchema({
      name: 'links',
      columns: [
        { name: 'from_id', type: 'string', isIndexed: true },
        { name: 'to_id', type: 'string', isIndexed: true },
        { name: 'relation', type: 'string' }, // 'consumes', 'finances', 'tagged', ...
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
    // Cross-pole objectives.
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'pole_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'target_type', type: 'string' }, // 'reach' | 'maintain' | 'reduce' | 'habit'
        { name: 'metric', type: 'string' },
        { name: 'target_value', type: 'number', isOptional: true },
        { name: 'current_value', type: 'number' },
        { name: 'unit', type: 'string', isOptional: true },
        { name: 'deadline', type: 'number', isOptional: true },
        { name: 'is_template', type: 'boolean' }, // imposed default vs. user-created
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
    // Free-form transversal tags.
    tableSchema({
      name: 'tags',
      columns: [
        { name: 'label', type: 'string', isIndexed: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
