/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          secondary: 'var(--color-surface-secondary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          soft: 'var(--color-border-soft)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          foreground: 'var(--color-primary-foreground)',
        },
        dark: {
          DEFAULT: 'var(--color-text-primary)',
          hover: 'var(--color-text-secondary)',
          light: 'var(--color-text-tertiary)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light: 'var(--color-danger-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Sarabun', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.03)',
        sm: '0 2px 6px rgba(15, 23, 42, 0.04)',
        md: '0 8px 20px rgba(15, 23, 42, 0.06)',
        lg: '0 12px 32px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
};
