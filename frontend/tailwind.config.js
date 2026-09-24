/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Blizzard DESIGN.md System Tokens
        blizzard: {
          bg: '#131928',
          bgDeep: '#0a0d15',
          surface: '#20273c',
          surfaceRaised: '#323a48',
          surfaceSoft: 'rgba(208, 233, 255, 0.20)',
          brand: '#38a8ff',
          brandStart: '#1888ef',
          brandEnd: '#009fe9',
          brandSoft: '#d0e9ff',
          border: 'rgba(255, 255, 255, 0.15)',
          borderStrong: 'rgba(208, 233, 255, 0.42)',
          scrim: 'rgba(10, 13, 21, 0.78)',
        },
        ocean: {
          950: '#0a0d15', // Midnight deep
          900: '#131928', // Midnight navy
          800: '#20273c', // Surface navy
          700: '#26314d', // Elevated surface
          600: '#323a48', // Interactive raised
        },
        ice: {
          100: '#ffffff', // Frost white
          200: '#d0e9ff', // Brand soft
          400: '#7ec6ff', // Light cyan
          500: '#38a8ff', // Blizzard brand blue
          600: '#1888ef', // Deep electric blue
        },
        steel: {
          400: 'rgba(255, 255, 255, 0.70)', // text-muted
          600: 'rgba(255, 255, 255, 0.35)',
          800: 'rgba(255, 255, 255, 0.15)', // border
          900: '#0a0d15',
        },
        health: {
          nominal: '#43c59e',
          degraded: '#f0b44d',
          critical: '#ef5a67',
          offline: '#64748b',
        }
      },
      fontFamily: {
        display: ['Poppins', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body: ['Archivo', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['Archivo', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        pill: '100px',
      },
      boxShadow: {
        'blizzard-btn': '0 0 25px rgba(56, 168, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        'blizzard-btn-hover': '0 0 35px rgba(56, 168, 255, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'blizzard-card': '0 16px 40px rgba(10, 13, 21, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'blizzard-glow': '0 0 20px rgba(56, 168, 255, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
