// frontend/src/App.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Importa nosso "molde" (Layout)
import { MainLayout } from "./components/layout/MainLayout";

// Importa as 6 páginas
import { HomePage } from "./pages/Home";
import { LancamentosPage } from "./pages/Lancamentos";
import { MetasPage } from "./pages/Metas";
import { ConfigPage } from "./pages/Config";
import { ErrorPage } from "./pages/ErrorPage";
import { RelatoriosPage } from "./pages/Relatorios"; // <-- NOVO
import { ImportarPage } from "./pages/Importar"; // <-- NOVO

// --- ESTRUTURA DE ROTAS ATUALIZADA ---
const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />, // O MainLayout é o "pai"
    errorElement: <ErrorPage />, // Página de erro

    // 'children' define as rotas "filhas"
    children: [
      {
        index: true, // Rota padrão (/)
        element: <HomePage />,
      },
      {
        path: "lancamentos",
        element: <LancamentosPage />,
      },
      {
        path: "metas",
        element: <MetasPage />,
      },
      {
        path: "relatorios", // <-- ROTA NOVA
        element: <RelatoriosPage />,
      },
      {
        path: "importar", // <-- ROTA NOVA
        element: <ImportarPage />,
      },
      {
        path: "config",
        element: <ConfigPage />,
      },
    ],
  },
]);

// O componente App agora SÓ renderiza o roteador
function App() {
  return <RouterProvider router={router} />;
}

export default App;
