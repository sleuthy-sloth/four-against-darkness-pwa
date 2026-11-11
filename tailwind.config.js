/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Traditional dungeon-crawler palette: dark stone, parchment, torchlight
        stone: {
          950: '#16141f',
          900: '#1f1b2b',
          800: '#2a2438',
          700: '#3a3247',
        },
        parchment: '#d8c9a3',
        torch: '#e8a13d',
        ember: '#b3541e',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
