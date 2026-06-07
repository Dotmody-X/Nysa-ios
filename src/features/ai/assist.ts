import { createEntry } from '@/db/repositories/entries';
import { POLE } from '@/poles/types';
import { logMeal, logMeditation, logMood, logSleep, logWorkout } from '@/features/wellbeing/wellbeing';
import { parseQuickAdd, type ParsedIntent } from './parser';

/**
 * The AI copilote entry point.
 *
 * Phase 2 ships a local parser (parser.ts) so capture works fully offline with
 * zero secrets. The real upgrade is a server-side Claude call: an Edge Function
 * that receives the sentence + minimal context and returns the same
 * `ParsedIntent` shape — so only the body of `interpret()` changes, nothing
 * downstream. That keeps user data minimisation in our hands (see CADRAGE §5).
 */

const USE_REMOTE = false; // flip on once the `ai` Edge Function is deployed

export async function interpret(text: string): Promise<ParsedIntent | null> {
  if (USE_REMOTE) {
    // TODO Phase 2.5: call supabase.functions.invoke('ai', { body: { text } })
    // and return the structured intent it produces.
  }
  return parseQuickAdd(text);
}

/** Acts on an intent by writing the matching entry. Returns a confirmation label. */
export async function applyIntent(intent: ParsedIntent): Promise<string> {
  switch (intent.kind) {
    case 'meditation':
      await logMeditation({ durationMin: intent.durationMin });
      break;
    case 'sleep':
      await logSleep({ durationMin: intent.durationMin, quality: 4 });
      break;
    case 'workout':
      await logWorkout({ activity: intent.activity, durationMin: intent.durationMin });
      break;
    case 'mood':
      await logMood({ level: intent.level });
      break;
    case 'meal':
      await logMeal({ kind: intent.meal });
      break;
    case 'task':
      await createEntry({
        poleId: POLE.work,
        type: 'task',
        title: intent.title,
        payload: { done: false },
      });
      break;
  }
  return intent.summary;
}

/** Convenience: interpret then apply. Returns the confirmation, or null if unrecognised. */
export async function captureText(text: string): Promise<string | null> {
  const intent = await interpret(text);
  if (!intent) return null;
  return applyIntent(intent);
}
