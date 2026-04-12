/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          50:  '#f0eeff',
          100: '#e0ddff',
          200: '#c5c0ff',
          300: '#a99aff',
          400: '#8b78ff',
          500: '#6C63FF',  // Main brand indigo
          600: '#5a4fe6',
          700: '#4a40cc',
          800: '#3b32a6',
          900: '#2d267a',
        },
        // Background layers
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          900: '#0d1117',
          950: '#0A0E1A',
        },
        // Status colors
        bull:   '#10B981',  // Gain / BUY
        bear:   '#EF4444',  // Loss / SELL
        hold:   '#F59E0B',  // HOLD
        // Dark sidebar
        dark: {
          100: '#1a1f2e',
          200: '#141825',
          300: '#0f1219',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand':   'linear-gradient(135deg, #6C63FF 0%, #a29bfe 100%)',
        'gradient-dark':    'linear-gradient(135deg, #0A0E1A 0%, #141825 100%)',
        'gradient-surface': 'linear-gradient(135deg, #1a1f2e 0%, #0f1219 100%)',
        'gradient-bull':    'linear-gradient(135deg, #10B981 0%, #34d399 100%)',
        'gradient-bear':    'linear-gradient(135deg, #EF4444 0%, #f87171 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 30px rgba(108, 99, 255, 0.3)',
        'glow-bull':    '0 0 20px rgba(16, 185, 129, 0.2)',
        'glow-bear':    '0 0 20px rgba(239, 68, 68, 0.2)',
        'glass':        '0 8px 32px rgba(0, 0, 0, 0.4)',
        'card':         '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':     'slideUp 0.4s ease-out',
        'fade-in':      'fadeIn 0.3s ease-in',
        'spin-slow':    'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
