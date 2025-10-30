/** @type {import('tailwindcss').Config} */
export default {
  // Ativa o Dark Mode
  darkMode: 'class', 
  
  // Diz ao Tailwind quais arquivos "assistir"
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  // Define sua paleta de cores personalizada
  theme: {
    extend: {
      colors: {
        'dark-bg': '#25391a',      // Forest Shadow (Fundo principal)
        'dark-card': '#3d5526',    // Dark Tea Leaf (Fundo dos cards)
        'text-primary': '#e8efe2', // Pale Jade (Texto principal)
        'text-secondary': '#94aa6e',// Olive Matcha (Texto mais suave)
        'accent': '#c6d3a0',       // Soft Matcha (Destaques, botões)
      },
    },
  },
  plugins: [],
}