import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Official Jobkar palette (2026-08-24) — four roles, strictly scoped:
        // primary = action blue (buttons, links); navy = brand (header, footer,
        // headings); accent = upgrade orange (pay CTA ONLY); success =
        // verified green (trust badges / payment success ONLY).
        primary: {
          DEFAULT: '#1D4ED8',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#1D4ED8',
          700: '#163BB0',
          900: '#12295F',
        },
        navy: {
          DEFAULT: '#0F2A4A',
          50: '#F3F6FA',
          100: '#E3EAF2',
          400: '#5A7391',
          500: '#33506F',
          600: '#22405E',
          700: '#0F2A4A',
          800: '#0B1F38',
          900: '#071626',
        },
        accent: {
          DEFAULT: '#F97316',
          50: '#FFF7ED',
          500: '#F97316',
          600: '#EA580C',
        },
        success: '#059669',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'card-hover': '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
export default config
