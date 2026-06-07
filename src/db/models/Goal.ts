import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export type GoalTargetType = 'reach' | 'maintain' | 'reduce' | 'habit';

/** A cross-pole objective. */
export class Goal extends Model {
  static table = 'goals';

  @text('pole_id') poleId!: string;
  @text('title') title!: string;
  @text('target_type') targetType!: GoalTargetType;
  @text('metric') metric!: string;
  @field('target_value') targetValue!: number | null;
  @field('current_value') currentValue!: number;
  @text('unit') unit!: string | null;
  @field('deadline') deadline!: number | null;
  @field('is_template') isTemplate!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('deleted_at') deletedAt!: number | null;
}
