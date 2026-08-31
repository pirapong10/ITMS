/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#E2E8F0',
          soft: '#F1F5F9',
        },
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          dark: '#1E40AF',
        },
        dark: {
          DEFAULT: '#0F172A',
          hover: '#1E293B',
          light: '#334155',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#ECFDF5',
          dark: '#047857',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
          dark: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEF2F2',
          dark: '#B91C1C',
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
