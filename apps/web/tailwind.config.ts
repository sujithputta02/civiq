import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F7FB',
        glass: {
          surface: 'rgba(255, 255, 255, 0.42)',
          stroke: 'rgba(255, 255, 255, 0.30)',
        },
        primary: {
          DEFAULT: '#0F172A',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#475569',
          foreground: '#FFFFFF',
        },
        accent: {
          primary: '#2563EB',
          verified: '#0F766E',
          urgent: '#D97706',
          error: '#BE123C',
        },
      },
      backgroundImage: {
        'liquid-glass':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-inner': 'inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;
