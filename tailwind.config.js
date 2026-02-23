/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-primary-hover)',
        accent: 'var(--color-primary-light)',
        dark: '#0f172a',
        light: '#f8fafc'
      }
    },
  },
  plugins: [],
}
