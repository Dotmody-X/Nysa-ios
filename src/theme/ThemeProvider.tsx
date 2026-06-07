import React, { createContext, useContext, useMemo, useState } from 'react';
import { type ThemeName, type ThemeTokens, themes } from './tokens';

type ThemeContextValue = {
  theme: ThemeTokens;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initial = 'soft',
}: {
  children: React.ReactNode;
  initial?: ThemeName;
}) {
  const [themeName, setThemeName] = useState<ThemeName>(initial);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[themeName],
      themeName,
      setTheme: setThemeName,
    }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the active theme tokens anywhere in the tree. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
