/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        secondary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: '#16a34a',
        warning: '#d97706',
        error:   '#dc2626',
        surface: '#f8fafc',
      },
      fontFamily: {
        sans:    ['Cairo-Regular', 'System'],
        medium:  ['Cairo-Medium', 'System'],
        semibold:['Cairo-SemiBold', 'System'],
        bold:    ['Cairo-Bold', 'System'],
      },
    },
  },
  plugins: [],
};
