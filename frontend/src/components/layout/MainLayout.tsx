// frontend/src/components/layout/MainLayout.tsx

import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar"; // Sidebar que já criamos

export function MainLayout() {
  return (
    // Fundo principal (com a cor nova)
    <div className="bg-background-dark min-h-screen w-full flex font-display text-text-light">
      {/* Sidebar (fixa na esquerda) */}
      <Sidebar />

      {/* Container do Conteúdo (à direita) */}
      {/* A 'main' agora é só um container. O Header, Padding, etc.
        serão definidos *dentro* de cada página (Home, Config, etc.)
      */}
      <main className="flex-1 flex flex-col h-screen">
        <Outlet />
      </main>
    </div>
  );
}
