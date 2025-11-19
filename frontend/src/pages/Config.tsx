// frontend/src/pages/ConfigPage.tsx
// (100% CONECTADO, COM EDIÇÃO DE CATEGORIAS AGORA FUNCIONAL)

import { useState, useEffect } from "react";
import axios from "axios";
import { CategoryModal } from "../components/CategoryModal"; // <-- NOVO

// --- CONFIGURAÇÃO DA API ---
const API_URL = "http://127.0.0.1:8000/api";

// --- TIPO PARA AS CATEGORIAS (vem da API) ---
interface Category {
  id: number;
  name: string;
  keywords: string; // Garantido como string após a correção do backend
}

// --- FUNÇÃO AUXILIAR PARA LER DO LOCALSTORAGE ---
function getInitialState(key: string, defaultValue: boolean): boolean {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Falha ao ler localStorage", e);
      return defaultValue;
    }
  }
  return defaultValue;
}

export function ConfigPage() {
  // --- ESTADO (State) ---

  const [activeTab, setActiveTab] = useState("Gerais");

  // Estados para a aba "Preferências Gerais" (mantidos)
  const [notifications, setNotifications] = useState(() =>
    getInitialState("settings_notifications", true)
  );
  const [emailAlerts, setEmailAlerts] = useState(() =>
    getInitialState("settings_emailAlerts", false)
  );
  const [weeklySummary, setWeeklySummary] = useState(() =>
    getInitialState("settings_weeklySummary", true)
  );
  const [uncategorized, setUncategorized] = useState(() =>
    getInitialState("settings_uncategorized", true)
  );

  // Estados para a aba "Categorias e Limites"
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // REMOVEMOS: newCategoryName, newKeywords, isSavingCategory

  const [error, setError] = useState<string | null>(null);

  // NOVOS ESTADOS PARA O MODAL
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // --- FUNÇÕES DA API (Categorias) ---

  // 1. FUNÇÃO DE BUSCAR (GET)
  const fetchCategories = async () => {
    setLoadingCategories(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/categories/`);
      setCategories(response.data);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
      setError("Falha ao buscar categorias.");
    } finally {
      setLoadingCategories(false);
    }
  };

  // 2. FUNÇÃO DE CRIAÇÃO (AGORA VAI PARA O MODAL)
  const handleOpenCreate = () => {
    setEditingCategory(null); // Garante que é modo de Criação
    setIsCategoryModalOpen(true);
  };

  // 3. FUNÇÃO DE EDIÇÃO (NOVA)
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  // 4. FUNÇÃO DE DELETAR (DELETE - mantida)
  const handleDeleteCategory = async (id: number) => {
    if (
      !window.confirm(
        "Tem certeza que quer apagar esta categoria? Isso irá desassociar todas as transações ligadas a ela."
      )
    ) {
      return;
    }
    setError(null);
    try {
      await axios.delete(`${API_URL}/categories/${id}`);
      setCategories(categories.filter((cat) => cat.id !== id));
      // Não recarregamos tudo, apenas filtramos
    } catch (err) {
      console.error("Erro ao deletar categoria:", err);
      setError("Falha ao deletar categoria.");
    }
  };

  // 5. FUNÇÃO DE SUCESSO (CHAMADA APÓS POST/PUT)
  const handleSaveSuccess = () => {
    fetchCategories(); // Recarrega os dados para atualizar a lista
    handleCloseModal();
  };

  // 6. FUNÇÃO DE FECHAR MODAL
  const handleCloseModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // --- HANDLERS DOS TOGGLES (COM LOCALSTORAGE - mantidos) ---
  const handleToggle = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    key: string
  ) => {
    setter((prevValue) => {
      const newValue = !prevValue;
      localStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  };

  // --- EFEITO (Effect - mantido) ---
  useEffect(() => {
    fetchCategories();
  }, []);

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* O Modal de Categoria (Edição/Criação) */}
      <CategoryModal
        // Abre se for para criar OU se houver uma categoria para editar
        isOpen={isCategoryModalOpen || !!editingCategory}
        onClose={handleCloseModal}
        onSaveSuccess={handleSaveSuccess}
        categoryToEdit={editingCategory}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-5xl flex-1">
            {/* ... (Cabeçalho e Abas mantidos) ... */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  Configurações e Personalização
                </h1>
                <p className="text-text-secondary text-base font-normal leading-normal">
                  Ajuste as configurações gerais, gerencie categorias, conecte
                  integrações e personalize a aparência do seu dashboard.
                </p>
              </div>
            </div>

            <div className="pb-3 sticky top-0 bg-accent-dark/80 backdrop-blur-sm z-10">
              <div className="flex border-b border-gray-800 px-4 gap-8">
                <button
                  onClick={() => setActiveTab("Gerais")}
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 transition-colors duration-200 ${
                    activeTab === "Gerais"
                      ? "border-b-primary text-white"
                      : "border-b-transparent text-text-secondary hover:text-white"
                  }`}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">
                    Preferências Gerais
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("Categorias")}
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 transition-colors duration-200 ${
                    activeTab === "Categorias"
                      ? "border-b-primary text-white"
                      : "border-b-transparent text-text-secondary hover:text-white"
                  }`}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">
                    Categorias e Limites
                  </p>
                </button>
              </div>
            </div>

            {/* Área de Conteúdo Principal (que muda com a Aba) */}
            <div className="p-4 space-y-8">
              {/* --- CONTEÚDO DA ABA 1: PREFERÊNCIAS GERAIS (MANTIDO) --- */}
              {activeTab === "Gerais" && (
                <div className="glassmorphism p-6 rounded-xl">
                  {/* ... (Todo o conteúdo da aba "Gerais" permanece o mesmo) ... */}
                  <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-1">
                    Preferências Gerais
                  </h2>
                  <p className="text-text-secondary text-base font-normal leading-normal pb-6">
                    Controle total sobre como o seu dashboard se comporta.
                    Configure alertas, notificações e o idioma do painel.
                  </p>

                  <div className="space-y-4">
                    {/* Toggle 1 */}
                    <div className="flex items-center gap-4 min-h-14 justify-between">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary text-2xl">
                          notifications
                        </span>
                        <p className="text-white text-base font-normal leading-normal flex-1 truncate">
                          Ativar notificações de metas
                        </p>
                      </div>
                      <div className="shrink-0">
                        <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-700 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary">
                          <div className="h-full w-[27px] rounded-full bg-white transition-transform"></div>
                          <input
                            checked={notifications}
                            onChange={() =>
                              handleToggle(
                                setNotifications,
                                "settings_notifications"
                              )
                            }
                            className="invisible absolute"
                            type="checkbox"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/10"></div>

                    {/* Toggle 2 */}
                    <div className="flex items-center gap-4 min-h-14 justify-between">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary text-2xl">
                          mail
                        </span>
                        <p className="text-white text-base font-normal leading-normal flex-1 truncate">
                          Enviar alertas de gastos por e-mail
                        </p>
                      </div>
                      <div className="shrink-0">
                        <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-700 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary">
                          <div className="h-full w-[27px] rounded-full bg-white transition-transform"></div>
                          <input
                            checked={emailAlerts}
                            onChange={() =>
                              handleToggle(
                                setEmailAlerts,
                                "settings_emailAlerts"
                              )
                            }
                            className="invisible absolute"
                            type="checkbox"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/10"></div>

                    {/* Toggle 3 */}
                    <div className="flex items-center gap-4 min-h-14 justify-between">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary text-2xl">
                          calendar_view_week
                        </span>
                        <p className="text-white text-base font-normal leading-normal flex-1 truncate">
                          Resumo semanal automático
                        </p>
                      </div>
                      <div className="shrink-0">
                        <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-700 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary">
                          <div className="h-full w-[27px] rounded-full bg-white transition-transform"></div>
                          <input
                            checked={weeklySummary}
                            onChange={() =>
                              handleToggle(
                                setWeeklySummary,
                                "settings_weeklySummary"
                              )
                            }
                            className="invisible absolute"
                            type="checkbox"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/10"></div>

                    {/* Toggle 4 */}
                    <div className="flex items-center gap-4 min-h-14 justify-between">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-primary text-2xl">
                          help
                        </span>
                        <p className="text-white text-base font-normal leading-normal flex-1 truncate">
                          Lembrar de registrar transações não categorizadas
                        </p>
                      </div>
                      <div className="shrink-0">
                        <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-700 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary">
                          <div className="h-full w-[27px] rounded-full bg-white transition-transform"></div>
                          <input
                            checked={uncategorized}
                            onChange={() =>
                              handleToggle(
                                setUncategorized,
                                "settings_uncategorized"
                              )
                            }
                            className="invisible absolute"
                            type="checkbox"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/10"></div>

                    {/* Selects (Dropdowns) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div>
                        <label
                          className="block text-sm font-medium text-text-secondary pb-2"
                          htmlFor="currency"
                        >
                          Moeda Padrão
                        </label>
                        <select
                          id="currency"
                          className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-primary focus:border-primary"
                        >
                          <option>Real Brasileiro (R$)</option>
                          <option>Dólar Americano (US$)</option>
                          <option>Euro (€)</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className="block text-sm font-medium text-text-secondary pb-2"
                          htmlFor="language"
                        >
                          Idioma do Sistema
                        </label>
                        <select
                          id="language"
                          className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-primary focus:border-primary"
                        >
                          <option>Português (Brasil)</option>
                          <option>English (US)</option>
                          <option>Español</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- CONTEÚDO DA ABA 2: CATEGORIAS E LIMITES --- */}
              {activeTab === "Categorias" && (
                <div className="glassmorphism p-6 rounded-xl">
                  <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-1">
                    Gerenciar Categorias
                  </h2>
                  <p className="text-text-secondary text-base font-normal leading-normal pb-6">
                    Crie, edite ou exclua categorias. Defina palavras-chave para
                    o auto-tagging.
                  </p>

                  {/* FORMULÁRIO SUBSTITUÍDO POR BOTÃO */}
                  <div className="border-b border-white/10 pb-6">
                    <button
                      onClick={handleOpenCreate}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-accent-dark bg-primary rounded-lg shadow-glow-primary hover:bg-opacity-90 transition-all disabled:bg-muted disabled:shadow-none"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Adicionar Nova Categoria
                    </button>
                  </div>

                  {/* Mensagem de Erro da API */}
                  {error && (
                    <p className="text-negative text-sm mt-4 text-center">
                      {error}
                    </p>
                  )}

                  {/* Lista de Categorias Existentes (Vinda da API) */}
                  <div className="space-y-4 pt-6">
                    <h3 className="text-white text-lg font-semibold">
                      Categorias Existentes
                    </h3>

                    {loadingCategories ? (
                      <p className="text-text-secondary text-center">
                        Carregando categorias...
                      </p>
                    ) : (
                      categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between gap-4 p-4 bg-background-dark/50 rounded-lg"
                        >
                          {/* Nome e Keywords */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                              {cat.name}
                            </p>
                            <p className="text-text-secondary text-sm truncate">
                              {cat.keywords}
                            </p>
                          </div>
                          {/* Botões de Ação */}
                          <div className="flex-shrink-0 flex gap-2">
                            <button
                              onClick={() => handleEdit(cat)} // <-- CONECTADO
                              className="flex items-center justify-center h-10 w-10 text-muted hover:text-white hover:bg-white/10 transition-colors duration-200 rounded-lg"
                            >
                              <span className="material-symbols-outlined text-xl">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="flex items-center justify-center h-10 w-10 text-muted hover:text-negative hover:bg-negative/10 transition-colors duration-200 rounded-lg"
                            >
                              <span className="material-symbols-outlined text-xl">
                                delete
                              </span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Se não tiver categorias */}
                    {!loadingCategories && categories.length === 0 && (
                      <p className="text-text-secondary text-center p-4">
                        Nenhuma categoria encontrada. Use o botão acima para
                        adicionar.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ações do Rodapé (mantidas) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mt-8">
              <div className="flex items-center gap-2 text-sm text-text-secondary group">
                <span className="material-symbols-outlined text-base group-hover:text-primary transition-colors">
                  info
                </span>
                <p>As configurações são salvas automaticamente.</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors rounded-lg">
                  Restaurar Padrões
                </button>
                <button className="px-5 py-2.5 text-sm font-bold text-accent-dark bg-primary rounded-lg shadow-glow-primary hover:bg-opacity-90 transition-all">
                  Salvar e Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
