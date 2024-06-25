import catppuccin from '@catppuccin/daisyui';
import daisyui, { type Config as DaisyConfig } from 'daisyui';
import { type Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
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
  plugins: [daisyui, animate],
  daisyui: {
    themes: [
      {
        // inspired by catppuccin mocha
        mocha: {
          'primary': '#7F31ED',
          'primary-content': '#FFFFFF',
          'secondary': '#1FA5E0',
          'secondary-content': '#89DCEB',
          'accent': '#CBA6F7',
          'accent-content': '#7F31ED',
          'neutral': '#3C3C5D',
          'neutral-content': '#C1C1D7',
          'base-100': '#14141F',
          'info': '#89DCEB',
          'info-content': '#1B6458',
          'success': '#A6E3A1',
          'success-content': '#379D2F',
          'warning': '#FAB387',
          'warning-content': '#C45008',
          'error': '#F38BA8',
          'error-content': '#B91341',
        },
      },
    ],
  } satisfies DaisyConfig,
} satisfies Config;
