/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Axiom DESIGN.md System Tokens
        axiom: {
          bg: '#0a0e1a',           // deep navy with blue tilt
          bgSoft: '#06080f',       // darker footer / nav band / code-block ground
          bgElevated: '#111729',   // raised card surface
          bgDeep: '#03050a',       // deepest tier
          surface: '#161d33',      // secondary panel
          surfaceHover: '#1d2540',
          surfaceActive: '#243057',
          surfaceElevated: '#1a2240',
          text: '#ffffff',
          textMuted: '#b8c0d4',
          textSoft: '#7a86a3',
          textFaint: '#4a5575',
          brand: '#1aaaff',        // electric cyan
          brandHover: '#0e8ed8',
          border: 'rgba(255, 255, 255, 0.08)' // 0x14 approx
        },
        ocean: {
          950: '#0a0e1a', // Axiom bg
          900: '#111729', // Axiom bg-elevated
          800: '#161d33', // Axiom surface
          700: '#1d2540', // Axiom surface-hover
          600: '#243057', // Axiom surface-active
        },
        ice: {
          100: '#ffffff',
          200: '#e0f4ff', 
          400: '#7ec6ff',
          500: '#1aaaff', // Axiom brand
          600: '#0e8ed8', // Axiom brand hover
        },
        steel: {
          400: '#b8c0d4', // Axiom textMuted
          600: '#7a86a3', // Axiom textSoft
          800: 'rgba(255, 255, 255, 0.08)', // Axiom border
          900: '#06080f', // Axiom bgSoft
        },
        health: {
          nominal: '#43c59e',
          degraded: '#f0b44d',
          critical: '#ef5a67',
          offline: '#64748b',
        }
      },
      fontFamily: {
        display: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
        heading: ['Inter', 'sans-serif']
      },
      borderRadius: {
        pill: '100px',
      },
      boxShadow: {
        'blizzard-btn': '0 0 0 rgba(0,0,0,0)', // Axiom uses flat solid buttons
        'blizzard-btn-hover': '0 0 0 rgba(0,0,0,0)',
        'blizzard-card': '0 4px 12px rgba(0,0,0,0.2)', // Axiom has sharp clean cards, not super glowing
        'blizzard-glow': '0 0 0 rgba(0,0,0,0)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
