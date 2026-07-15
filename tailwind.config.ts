import type { Config } from 'tailwindcss';
import { tokens } from './src/lib/design-tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: tokens.space,
      fontFamily: tokens.font.family,
      fontSize: tokens.font.size,
      fontWeight: tokens.font.weight,
      colors: tokens.color,
    },
  },
} satisfies Config;
