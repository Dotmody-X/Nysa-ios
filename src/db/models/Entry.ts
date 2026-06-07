import { Model } from '@nozbe/watermelondb';
import { date, field, json, readonly, text } from '@nozbe/watermelondb/decorators';

const sanitizePayload = (raw: unknown) => (raw && typeof raw === 'object' ? raw : {});

/** The atomic unit of data across every pole. */
export class Entry extends Model {
  static table = 'entries';

  @text('pole_id') poleId!: string;
  @text('type') type!: string;
  @text('title') title!: string;
  @json('payload', sanitizePayload) payload!: Record<string, unknown>;
  @date('occurred_at') occurredAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('deleted_at') deletedAt!: number | null;
}
