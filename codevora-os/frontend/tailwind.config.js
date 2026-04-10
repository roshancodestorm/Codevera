/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neonCyan: '#00F2FF',
        bgDark: '#02050a',
        bgPanel: '#0a0f1e',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(0, 242, 255, 0.4), 0 0 60px rgba(0, 242, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
