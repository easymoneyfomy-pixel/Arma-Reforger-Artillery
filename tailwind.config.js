/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0c0a',
          panel: '#0f1310',
          raised: '#141a15',
        },
        line: '#1f2a21',
        accent: {
          DEFAULT: '#7fb069',
          dim: '#4a6b3d',
          glow: '#a3c585',
        },
        warn: '#d4a256',
        danger: '#c44d4d',
        muted: '#6b7565',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"IBM Plex Mono"', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        inset: 'inset 0 0 0 1px #1f2a21',
      },
    },
  },
  plugins: [],
};
