/**
 * Layer 2 of the assistant — an optional, on-device language model.
 *
 * Strategy: the LLM never "knows" the app. Its only job is to REWRITE a free
 * sentence into one of the assistant's supported command phrasings (the same
 * ones the deterministic Layer-1 engine already understands). Layer 1 then
 * executes it — reliably, offline, with zero dependency.
 *
 *   user: "tu peux me noter du beurre pour les courses stp"
 *   LLM → "ajoute du beurre aux courses"
 *   Layer 1 → adds it.
 *
 * This file is pure JS and ships with NO model: `provider` stays null until a
 * native model (e.g. via react-native-executorch) registers one with
 * `setLlmProvider()` at app start. Until then the assistant works as Layer 1.
 */

export interface LlmProvider {
  /** True once the model is loaded and ready to infer. */
  isReady(): boolean;
  /**
   * Rewrite `text` into ONE supported command, choosing from `grammar`
   * (example commands). Return the rewritten command, or null if none fits.
   */
  rewriteToCommand(text: string, grammar: string[]): Promise<string | null>;
}

let provider: LlmProvider | null = null;

export function setLlmProvider(p: LlmProvider | null) {
  provider = p;
}

export function llmReady(): boolean {
  return !!provider?.isReady();
}

/** Ask the on-device model to map free language onto a known command. */
export async function rewriteToCommand(text: string, grammar: string[]): Promise<string | null> {
  if (!provider?.isReady()) return null;
  try {
    const out = await provider.rewriteToCommand(text, grammar);
    return out?.trim() || null;
  } catch (e) {
    console.warn('[llm] rewrite failed', e);
    return null;
  }
}
