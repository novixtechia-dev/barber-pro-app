/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#006BFF',
        electric: '#2DD4FF',
        glow: '#5BE7FF',
        dark: '#090B10',
        surface: '#131722',
        border: '#1F2A44',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        zinc: {
          850: '#1f1f23',
          950: '#0a0a0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 2px 10px 0 rgba(0,0,0,0.2)', // Sombra normal e discreta (sem neon)
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,107,255,0.2)' },
          '50%': { boxShadow: '0 0 0 10px rgba(0,107,255,0)' },
        },
      },
      backgroundImage: {
        // 2 tons de azul: um mais forte (#0055ff) para um azul vibrante (#0099ff)
        'electric-gradient': 'linear-gradient(90deg, #0055ff 0%, #0099ff 100%)',
        'dark-gradient': 'linear-gradient(180deg, #090B10 0%, #050608 100%)',
      },
    },
  },
  plugins: [],
};
