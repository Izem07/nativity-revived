/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['index.html', './src/**/*.{ts,tsx,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', '"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        zinc: {
          925: '#111115',
          950: '#09090b',
          975: '#050507',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        glass: '0 20px 45px -15px rgba(0, 0, 0, 0.7)',
        luxury: '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
        glow: '0 0 40px -10px rgba(99, 102, 241, 0.3)',
        'glow-amber': '0 0 40px -10px rgba(245, 158, 11, 0.25)',
        'glow-emerald': '0 0 40px -10px rgba(16, 185, 129, 0.25)',
        'glow-violet': '0 0 40px -10px rgba(139, 92, 246, 0.25)',
      },
      backgroundImage: {
        'noise': "radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
