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
      // Charcoal Typography Tokens:
      // text-xs: 12px / 20px (Charcoal typography-12)
      // text-sm: 14px / 22px (Charcoal typography-14)
      // text-base: 16px / 24px (Charcoal typography-16)
      // text-lg: 20px / 28px (Charcoal typography-20)
      // text-xl: 20px / 28px (Charcoal typography-20)
      // text-2xl: 32px / 40px (Charcoal typography-32)
      fontSize: {
        xs: ['12px', { lineHeight: '20px' }],
        sm: ['14px', { lineHeight: '22px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['32px', { lineHeight: '40px' }],
      },
    },
  },
  plugins: [],
}

