// frontend/src/pages/ErrorPage.tsx

// Este componente não importa 'useRouteError' para evitar os erros de tipo (unknown).
// É uma página de erro estática.

export function ErrorPage() {
  return (
    // Esta página substitui o MainLayout, então ela tem seu próprio fundo
    <div className="bg-dark-bg min-h-screen w-full flex items-center justify-center p-8">
      <div className="text-center w-full max-w-lg bg-dark-card p-8 rounded-lg shadow-2xl">
        <h1 className="text-4xl font-bold text-text-primary">Oops! (404)</h1>
        <p className="text-text-secondary mt-4">
          A página que você tentou acessar não foi encontrada.
        </p>

        <p className="text-red-400 mt-2 font-mono bg-dark-bg p-2 rounded">
          <i>Erro de Rota</i>
        </p>

        <a
          href="/"
          className="mt-6 inline-block bg-accent text-dark-bg font-bold py-2 px-6 rounded-lg hover:bg-opacity-80"
        >
          Voltar para a Home
        </a>
      </div>
    </div>
  );
}
