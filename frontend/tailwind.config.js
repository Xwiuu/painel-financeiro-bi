/** @type {import('tailwindcss').Config} */
export default {
    // 1. O modo 'class' está correto (vamos usar <html class="dark">)
    darkMode: "class",

    // 2. Aponta para os nossos arquivos .tsx
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],

    // 3. Sua nova paleta de cores e fontes!
    theme: {
        extend: {
            colors: {
                "primary": "#00ff9d",
                "background-light": "#f5f8f7",
                "background-dark": "#0F0F0F", // <- Nosso novo fundo principal
                "glass": "rgba(40, 40, 40, 0.5)",
                "positive": "#00ff9d",
                "negative": "#ff4560",
                "muted": "#A0A0A0"
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"] // <- Sua nova fonte
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            boxShadow: {
                'glow-primary': '0 0 15px rgba(0, 255, 157, 0.3)',
                'glow-primary-sm': '0 0 8px rgba(0, 255, 157, 0.2)',
            }
        },
    },
    plugins: [],
}