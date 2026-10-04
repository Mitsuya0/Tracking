/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          bg: 'var(--charcoal-color-background-default)',
          container: 'var(--charcoal-color-container-default)',
          'container-secondary': 'var(--charcoal-color-container-secondary-default)',
          'container-tertiary': 'var(--charcoal-color-container-tertiary-default)',
          surface: 'var(--charcoal-color-container-default)',
          'surface-subtle': 'var(--charcoal-color-container-secondary-default)',
          border: 'var(--charcoal-color-border-default)',
          text: 'var(--charcoal-color-text-default)',
          'text-muted': 'var(--charcoal-color-text-secondary-default)',
          brand: 'var(--charcoal-color-brand-default, #6366f1)',
        },
      },
    },
  },
  plugins: [],
}

