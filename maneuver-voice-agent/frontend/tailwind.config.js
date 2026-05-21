/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'maneuver-bg': '#0D0D0F',
        'maneuver-text': '#F0EEE9',
        'maneuver-muted': '#8A8880',
        'maneuver-accent': '#E8593C',
        'maneuver-teal': '#2A7A68',
        'maneuver-card': '#1A1A1F',
        'maneuver-border': '#2A2A30',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
