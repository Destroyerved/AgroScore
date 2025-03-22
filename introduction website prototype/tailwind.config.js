/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00712D',
        secondary: '#FF9100',
        accent: {
          light: '#D5ED9F',
          yellow: '#FFFBE6'
        }
      }
    },
  },
  plugins: [],
};