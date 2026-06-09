/**
 * Design tokens — the single source of truth for the visual language.
 *
 * Nothing in the UI should hard-code a hex value, font name, or spacing
 * number. Everything references these tokens. A "theme" (style pack) is just
 * a different `ThemeTokens` object, so swapping themes never touches UI code.
 */

export type ThemeTokens = {
  name: string;
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    ink: string;
    inkSoft: string;
    primary: string;
    secondary: string;
    accent: string;
    onPrimary: string;
    onAccent: string;
    border: string;
    muted: string;
    success: string;
    danger: string;
  };
  fonts: {
    display: string; // titles
    body: string; // paragraphs
    accent: string; // numbers, stats, small labels
  };
  /** Two-stop gradients (kept for occasional fills). */
  gradients: {
    primary: [string, string];
    secondary: [string, string];
    accent: [string, string];
    sun: [string, string];
  };
  /** Flat color layers (outer → inner) for stacked organic blobs. */
  blobs: {
    primary: string[];
    secondary: string[];
    accent: string[];
  };
  /** A distinct on-brand color per pole: solid + blob layers + glyph color. */
  poleColors: Record<string, { solid: string; layers: string[]; on: string }>;
  radius: {
    sm: number;
    md: number;
    bento: number;
    pill: number;
  };
  spacing: (n: number) => number; // 4pt base grid
  durations: {
    fast: number;
    base: number;
    slow: number;
  };
};

const spacing = (n: number) => n * 4;

/** Default launch theme — "Soft": organic, cream background, rounded bento. */
export const softTheme: ThemeTokens = {
  name: 'soft',
  colors: {
    bg: '#F6F9EF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2E3',
    ink: '#1A0708',
    inkSoft: '#5A5453',
    primary: '#D6DA2F',
    secondary: '#D595CF',
    accent: '#395D6C',
    onPrimary: '#1A0708',
    onAccent: '#F6F9EF',
    border: '#E4E7DB',
    muted: '#8A8D85',
    success: '#3FA34D',
    danger: '#D14B4B',
  },
  fonts: {
    display: 'Chillax',
    body: 'Inter',
    accent: 'SpaceGrotesk',
  },
  gradients: {
    primary: ['#EAF08A', '#CDD221'],
    secondary: ['#F4D2F0', '#D595CF'],
    accent: ['#5C8597', '#2E4E5B'],
    sun: ['#FCE588', '#D6DA2F'],
  },
  blobs: {
    primary: ['#E8EE9A', '#D6DA2F', '#AEB223'],
    secondary: ['#EFCDEB', '#DD9FD6', '#C76FBE'],
    accent: ['#8FB0BD', '#5C8597', '#2E4E5B'],
  },
  poleColors: {
    planning: { solid: '#395D6C', layers: ['#8FB0BD', '#5C8597', '#2E4E5B'], on: '#F6F9EF' },
    work: { solid: '#D6DA2F', layers: ['#E8EE9A', '#D6DA2F', '#AEB223'], on: '#1A0708' },
    wellbeing: { solid: '#D595CF', layers: ['#EFCDEB', '#DD9FD6', '#C76FBE'], on: '#1A0708' },
    finance: { solid: '#395D6C', layers: ['#8FB0BD', '#5C8597', '#2E4E5B'], on: '#F6F9EF' },
    home: { solid: '#D6DA2F', layers: ['#E8EE9A', '#D6DA2F', '#AEB223'], on: '#1A0708' },
    learning: { solid: '#395D6C', layers: ['#8FB0BD', '#5C8597', '#2E4E5B'], on: '#F6F9EF' },
    relationships: { solid: '#D595CF', layers: ['#EFCDEB', '#DD9FD6', '#C76FBE'], on: '#1A0708' },
    leisure: { solid: '#D6DA2F', layers: ['#E8EE9A', '#D6DA2F', '#AEB223'], on: '#1A0708' },
  },
  radius: { sm: 14, md: 22, bento: 34, pill: 999 },
  spacing,
  durations: { fast: 150, base: 250, slow: 400 },
};

/** A second theme stub to prove the swap works end-to-end (Phase 5 expands this). */
export const boldTheme: ThemeTokens = {
  ...softTheme,
  name: 'bold',
  colors: {
    ...softTheme.colors,
    bg: '#1A0708',
    surface: '#241312',
    surfaceAlt: '#2E1A18',
    ink: '#F6F9EF',
    inkSoft: '#C9C2C1',
    onPrimary: '#1A0708',
    onAccent: '#1A0708',
    border: '#3A2422',
    muted: '#9A8F8E',
  },
  gradients: {
    primary: ['#D6DA2F', '#9DA017'],
    secondary: ['#D595CF', '#9E5F98'],
    accent: ['#5C8597', '#2E4E5B'],
    sun: ['#F4C44A', '#D6DA2F'],
  },
  blobs: {
    primary: ['#E8EE9A', '#D6DA2F', '#9DA017'],
    secondary: ['#E6B6E0', '#D595CF', '#A766A0'],
    accent: ['#7FA3B2', '#5C8597', '#39606E'],
  },
  radius: { sm: 6, md: 10, bento: 16, pill: 999 },
};

export const themes = { soft: softTheme, bold: boldTheme } as const;
export type ThemeName = keyof typeof themes;
