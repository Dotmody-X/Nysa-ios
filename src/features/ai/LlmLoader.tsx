/**
 * On-device LLM loader — currently a NO-OP.
 *
 * The native runtime (react-native-executorch) was removed because it broke
 * WatermelonDB's native linking in the iOS build and can't run on the
 * simulator anyway. The Layer-2 architecture is preserved: `llm.ts` exposes the
 * provider interface and `skills.ts` falls back to it when present. To re-enable
 * later, reinstall react-native-executorch (+ expo resource fetcher) on a real
 * device and register a provider here via `setLlmProvider(...)`.
 */
export function LlmLoader() {
  return null;
}
