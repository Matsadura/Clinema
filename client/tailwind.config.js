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
    },
  },
  plugins: [],
}