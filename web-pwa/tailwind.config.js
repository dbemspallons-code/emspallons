/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'emsp-yellow': '#facc15',
        'emsp-yellow-light': '#fef08a',
        'emsp-yellow-dark': '#eab308',
        'emsp-green': '#22c55e',
        'emsp-green-light': '#86efac',
        'emsp-green-dark': '#16a34a',
      },
    },
  },
  plugins: [],
}

