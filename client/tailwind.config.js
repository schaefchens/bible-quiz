/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0a0f1e',
        'brand-navy': '#111827',
        'brand-gold': '#d4af37',
        'brand-gold-light': '#f0c040',
        'brand-amber': '#f59e0b',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'Times New Roman', 'serif'],
        body: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'reveal-answer': 'revealAnswer 0.5s ease-out',
        shake: 'shake 0.5s ease-in-out',
        'scale-up': 'scaleUp 0.3s ease-out',
        'question-exit': 'questionExit 0.28s ease-in forwards',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': {
            boxShadow: '0 0 8px 2px rgba(212,175,55,0.4)',
            borderColor: '#d4af37',
          },
          '50%': {
            boxShadow: '0 0 20px 6px rgba(240,192,64,0.7)',
            borderColor: '#f0c040',
          },
        },
        glow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        revealAnswer: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        scaleUp: {
          from: { transform: 'scale(0.85)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      // Targets phones in landscape (height < 600px); tablets have enough height and don't need this.
      addVariant('landscape', '@media (orientation: landscape) and (max-height: 600px)');
    },
  ],
};
