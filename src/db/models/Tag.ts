import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

/** A free-form transversal tag (e.g. #travel links a meal, an expense, a photo). */
export class Tag extends Model {
  static table = 'tags';

  @text('label') label!: string;
  @text('color') color!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('deleted_at') deletedAt!: number | null;
}
