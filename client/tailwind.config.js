/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#fff8f2',
          100: '#ffede0',
          200: '#ffd6bd',
          300: '#ffb58a',
          400: '#ff8a47',
          500: '#ff6e1a', // Clean, vibrant, premium modern electric orange
          600: '#f05700',
          700: '#c74200',
          800: '#9e3504',
          950: '#431200',
        },
      },
      fontFamily: {
        sans: ['Hind Siliguri', 'Noto Sans Bengali', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
