/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        linear: {
          bg: '#08090a',
          bgMarketing: '#010102',
          bgLevel1: '#0f1011',
          bgLevel2: '#141516',
          bgLevel3: '#1a1b1d',
          bgOverlay: 'rgba(8,9,10,0.72)',
          surface: '#0f1011',
          surfaceStrong: '#141516',
          surfaceTintedBrand: 'rgba(94,106,210,0.08)',
          text: '#f7f8f8',
          textStrong: '#ffffff',
          textSecondary: '#d0d6e0',
          textTertiary: '#8a8f98',
          textQuaternary: '#62666d',
          textDisabled: '#3d3f44',
          brand: '#5e6ad2',
          brandHover: '#7170ff',
          brandPress: '#4a55c1',
          brandSoft: 'rgba(94,106,210,0.16)',
          accent: '#7170ff',
          link: '#828fff',
          linkHover: '#a3acff',
          border: '#23252a',
          borderStrong: '#34343a',
          borderSubtle: 'rgba(255,255,255,0.06)',
          borderBrand: '#5e6ad2',
          ctaFill: '#e5e5e6',
          ctaFillHover: '#f3f3f4',
          ctaFillPress: '#cfcfd1',
          ctaText: '#08090a',
          success: '#4cb782',
          successBg: 'rgba(76,183,130,0.12)',
          warning: '#f2c94c',
          warningBg: 'rgba(242,201,76,0.12)',
          danger: '#eb5757',
          dangerBg: 'rgba(235,87,87,0.12)',
          info: '#5e6ad2',
          infoBg: 'rgba(94,106,210,0.12)',
          chipBg: '#1a1b1d',
          chipText: '#d0d6e0',
          chipBorder: '#34343a',
          onBrand: '#ffffff'
        }
      },
      fontFamily: {
        display: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        body: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Berkeley Mono', 'Menlo', 'monospace'],
        heading: ['Inter', 'sans-serif']
      },
      borderRadius: {
        pill: '9999px',
        micro: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        card: '24px'
      },
      boxShadow: {
        'ambient': '0 1px 2px rgba(0,0,0,0.4)',
        'popover': '0 8px 24px rgba(0,0,0,0.5)',
        'modal': '0 24px 48px rgba(0,0,0,0.6)',
        'ring-focus': '0 0 0 3px rgba(94,106,210,0.32)',
        'ring-cta': '0 0 0 2px #7170ff'
      }
    },
  },
  plugins: [],
}
