import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */

// Colours are CSS variables (see src/index.css) so the palette lives in one
// place and supports Tailwind's opacity modifiers (e.g. `border-line/10`).
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        raised: token('raised'),
        surface: { DEFAULT: token('surface'), hover: token('surface-hover') },
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: { DEFAULT: token('accent'), strong: token('accent-strong'), ink: token('accent-ink') },
        like: token('like'),
        dislike: token('dislike'),
      },
      fontFamily: {
        // Editorial display serif for headings, a highly legible sans for UI
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // Display sizes for the serif; body sizes follow Tailwind defaults
        'display-sm': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        display: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
        'display-lg': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        prose: '65ch',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'sheet-up': {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in': 'slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [
    // `light:` styles apply only in the light theme
    plugin(({ addVariant }) => addVariant('light', ':root[data-theme="light"] &')),
  ],
}
