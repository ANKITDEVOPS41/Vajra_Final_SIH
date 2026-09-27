/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0a0d15',
          card: '#131928',
          surface: '#1a2236',
          border: '#1e293b',
          borderLight: '#334155',
          accent: '#1888ef',
          accentLight: '#009fe9',
          alert: '#ef4444',
          warning: '#f59e0b',
          ok: '#10b981',
          cloudburst: '#a855f7',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
