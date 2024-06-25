import catppuccin from '@catppuccin/daisyui';
import daisyui, { type Config as DaisyConfig } from 'daisyui';
import { type Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [catppuccin('mocha', 'lavender')],
  } satisfies DaisyConfig,
} satisfies Config;
