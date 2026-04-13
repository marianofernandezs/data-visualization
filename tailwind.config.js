/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        background: 'var(--background)',
        textPrimary: 'var(--text-primary)',
        warning: '#F59E0B',
        error: '#EF4444',
        success: '#10B981',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'Roboto', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        'BRAND': '10px',
      }
    },
  },
  plugins: [],
}
