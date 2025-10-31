// frontend/src/components/layout/MainLayout.tsx

import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function MainLayout() {
  return (
    // 1. O fundo é aplicado no container principal
    <div className="bg-background-dark min-h-screen w-full flex font-display text-[#E0E0E0]">
      {/* 2. A Sidebar (já tem w-64) */}
      <Sidebar />

      {/* 3. O Conteúdo (ocupa o resto, 'flex-1') */}
      {/* Seu HTML tinha um <header> e um <div p-8>. 
        Vamos deixar o <Outlet> cuidar disso por enquanto.
        Vamos adicionar o <header> na próxima etapa (na Home).
      */}
      <main className="flex-1 flex flex-col">
        {/* O <Outlet> é onde as páginas (Home, Metas) serão renderizadas */}
        <Outlet />
      </main>
    </div>
  );
}
