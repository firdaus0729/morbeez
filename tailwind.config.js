/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./theme/**/*.{liquid,json,js}'],
  theme: {
    extend: {
      colors: {
        morbeez: {
          primary: 'var(--color-primary)',
          accent: 'var(--color-accent)',
          trust: 'var(--color-trust)',
          surface: 'var(--color-surface)',
          muted: 'var(--color-muted)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Noto Sans Malayalam', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};
