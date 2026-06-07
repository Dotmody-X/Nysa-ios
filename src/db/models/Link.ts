import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

/** A directed relationship between two entries (or entry <-> goal). */
export class Link extends Model {
  static table = 'links';

  @text('from_id') fromId!: string;
  @text('to_id') toId!: string;
  @text('relation') relation!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('deleted_at') deletedAt!: number | null;
}
