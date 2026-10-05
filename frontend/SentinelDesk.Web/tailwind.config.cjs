/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sd: {
          bg: '#07111f',
          panel: '#0c1929',
          line: '#1d3044',
          muted: '#7890a7',
          cyan: '#2dd4bf',
          blue: '#38bdf8',
          red: '#fb7185',
          amber: '#fbbf24',
        },
      },
    },
  },
  plugins: [],
}
