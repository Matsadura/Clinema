/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      textColor: ['dark', 'dark:hover'],
      colors: {
        primary: '#369a31', // green
        secondary: {
          lighter: '#5271ff', // blue-lighter
          light: '#373944', // blue-light
          DEFAULT: '#2b2c36', // blue
          dark: '#23232c', // blue-dark
        },
        white: '#ebebec',
        'white-light': '#ebebec',
      },
      fontFamily: {
        sans: ['Gothic A1', 'sans-serif'], // Typography
      },
      animation: {
        'infinite-scroll': 'infinite-scroll 25s linear infinite',
      },
      keyframes: {
        'infinite-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        }
      },
    },
  },
  plugins: [],
}
