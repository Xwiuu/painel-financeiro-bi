/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // --- SUA NOVA PALETA ---
                "primary": "#00ff9d",
                "background-light": "#f5f8f7",
                "background-dark": "#0f231b", // <-- Novo Fundo
                "accent-dark": "#0F0F0F",     // <-- Fundo dos Painéis Antigos
                "panel-dark": "rgba(32, 75, 59, 0.5)", // <-- Novo Painel
                "text-light": "#E0E0E0",
                "text-secondary": "#888888",
                // --- Cores Antigas (para os gráficos) ---
                "positive": "#00ff9d",
                "negative": "#ff4560",
                "muted": "#A0A0A0",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            boxShadow: { // Novo Efeito de Glow
                'glow-primary': '0 0 8px rgba(0, 255, 157, 0.3), 0 0 20px rgba(0, 255, 157, 0.2)',
                'glow-primary-sm': '0 0 8px rgba(0, 255, 157, 0.2)',
            }
        },
    },
    // Adiciona o plugin 'forms' que seu HTML usa (para os <select>)
    plugins: [
        require('@tailwindcss/forms'),
    ],
}