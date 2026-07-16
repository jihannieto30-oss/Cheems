import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        paper: '#FFFFFF',
        muted: '#666666',
        accent: '#1E5EFF',
        hairline: 'rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter2: '-0.035em',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'lux': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        lux: '0 40px 120px -40px rgba(0,0,0,0.35)',
        card: '0 20px 60px -30px rgba(0,0,0,0.25)',
        glass: '0 8px 40px -12px rgba(0,0,0,0.12)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
