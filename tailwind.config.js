/** @type {import('tailwindcss').Config} */
// Brand tokens are the single source of truth for colors and fonts.
// Themes (style packs) swap these via CSS-variable overrides at runtime,
// but the palette below is the default "Soft" launch theme.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Core brand palette
        lime: '#D6DA2F', // primary accent — energy, action
        lilac: '#D595CF', // secondary accent — soft / emotional
        teal: '#395D6C', // deep accent — structure, trust
        cream: '#F6F9EF', // background
        ink: '#1A0708', // near-black, from the logo
        // Semantic aliases (themes remap these)
        bg: '#F6F9EF',
        surface: '#FFFFFF',
        primary: '#D6DA2F',
        secondary: '#D595CF',
        accent: '#395D6C',
        muted: '#6B7280',
      },
      fontFamily: {
        display: ['Chillax', 'sans-serif'], // titles
        body: ['Inter', 'sans-serif'], // body copy
        accent: ['SpaceGrotesk', 'sans-serif'], // numbers / stats / labels
      },
      borderRadius: {
        bento: '28px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
