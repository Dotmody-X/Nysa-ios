import { useFonts } from 'expo-font';

/**
 * Loads the brand typefaces (all variable fonts). The family names registered
 * here must match `fonts.*` in tokens.ts.
 *   - Chillax       → display / titles
 *   - Inter         → body
 *   - SpaceGrotesk  → accents, numbers, labels
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Chillax: require('../../assets/fonts/Chillax-Variable.ttf'),
    Inter: require('../../assets/fonts/InterVariable.ttf'),
    SpaceGrotesk: require('../../assets/fonts/SpaceGrotesk-VariableFont_wght.ttf'),
  });
  return loaded;
}
