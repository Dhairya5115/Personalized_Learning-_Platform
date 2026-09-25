/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        edx: {
          bg: '#ffffff',
          'bg-secondary': '#00262b',
          'bg-subtle': '#f9f8f6',
          'bg-neutral': '#edebe3',
          text: '#00262b',
          'text-secondary': '#52716c',
          'text-muted': '#a5b6b1',
          primary: '#04c5e7',
          secondary: '#d64000',
          border: '#f3f1ed',
          'border-strong': '#e1ddd1',
        },
      },
      boxShadow: {
        edx: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px',
        'edx-hover': 'rgba(0, 0, 0, 0.12) 0px 4px 12px 0px, rgba(0, 0, 0, 0.08) 0px 2px 4px -1px',
      },
      borderRadius: {
        pill: '94px',
        card: '12px',
      },
    },
  },
  plugins: [],
}
