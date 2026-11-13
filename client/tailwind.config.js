/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#369a31',
          light: '#4cbf45',
          dark: '#267222',
        },
        secondary: {
          lighter: '#5271ff',
          light: '#373944',
          DEFAULT: '#2b2c36',
          dark: '#23232c',
          darker: '#1a1a21',
        },
        white: '#ebebec',
      },
      fontFamily: {
        sans: ['"Gothic A1"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
