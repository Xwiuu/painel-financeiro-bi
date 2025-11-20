const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Garante que não há barras duplicadas se a variável vier com barra no final
const CLEAN_BASE_URL = BASE_URL.replace(/\/+$/, "");

// Exporta a URL completa para a API (ex: https://meu-app.onrender.com/api)
export const API_URL = `${CLEAN_BASE_URL}/api`;