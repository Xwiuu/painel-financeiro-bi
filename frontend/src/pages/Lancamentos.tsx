// frontend/src/pages/LancamentosPage.tsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importa o modal (agora atualizado)
import { QuickEntryModal } from "../components/QuickEntryModal";

// Importa a URL centralizada
import { API_URL } from "../config";

// --- DEFINIÇÃO DOS TIPOS ---
interface Transaction {
  id: number;
  date: string; // "YYYY-MM-DD"
  description: string;
  value: number;
  type: "income" | "expense" | "investment";
  category_name: string | null;
}

interface Summary {
  total_income: number;
  total_expense: number;
  total_investment: number;
  balance: number;
}

interface Filters {
  search: string;
  type: string; // "all", "income", "expense", "investment"
  month_year: string; // "YYYY-MM" ou ""
}

// --- INÍCIO DO COMPONENTE ---
export function LancamentosPage() {
  const navigate = useNavigate();

  // --- ESTADOS (State) ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "all",
    month_year: "",
  });

  // Estado para a lista de meses do filtro
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Estados para o modal (Criar vs Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- FUNÇÕES DE BUSCA DE DADOS ---

  // Busca a lista de transações
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.month_year) params.append("month_year", filters.month_year);

      // Atualizado para usar API_URL do config
      const response = await axios.get(`${API_URL}/transactions/all`, {
        params,
      });

      setTransactions(response.data.transactions);
      setSummary(response.data.summary);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Falha ao buscar transações.");
    } finally {
      setLoading(false);
    }
  }, [filters]); // Depende dos filtros

  // Busca os meses disponíveis (só 1 vez)
  const fetchMonths = async () => {
    try {
      // Atualizado para usar API_URL do config
      const response = await axios.get(`${API_URL}/transactions/months`);
      setAvailableMonths(response.data);
    } catch (err) {
      console.error("Erro ao buscar meses:", err);
    }
  };

  // --- EFEITOS (Triggers) ---

  // Roda a busca principal sempre que os filtros mudam
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300); // Debounce de 300ms
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  // Roda a busca de meses SÓ UMA VEZ quando a página carrega
  useEffect(() => {
    fetchMonths();
  }, []); // Array vazio = roda 1 vez

  // --- FUNÇÕES DE AÇÃO (Handlers) ---

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Handler para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  // Handler para salvar (Criar ou Editar)
  const handleSaveSuccess = () => {
    handleCloseModal();
    fetchTransactions(); // Recarrega a tabela
    fetchMonths(); // Recarrega os meses (caso um novo mês tenha sido criado)
  };

  // Handler para Apagar
  const handleDelete = async (transactionId: number) => {
    // Pede confirmação
    if (!window.confirm("Tem certeza que deseja apagar este lançamento?")) {
      return;
    }

    try {
      // Atualizado para usar API_URL do config
      await axios.delete(`${API_URL}/transactions/${transactionId}`);
      fetchTransactions(); // Recarrega a tabela
      fetchMonths(); // Recarrega os meses (caso tenha sido o último daquele mês)
    } catch (err) {
      console.error(err);
      setError("Falha ao apagar transação.");
    }
  };

  // Handler para Editar (abre o modal em modo de edição)
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  // Formata o mês "YYYY-MM" para "Outubro / 2024"
  const formatMonthYear = (monthString: string) => {
    try {
      const [year, month] = monthString.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      // 'LLLL' = nome do mês por extenso, 'y' = ano
      return format(date, "LLLL / y", { locale: ptBR });
    } catch {
      return monthString; // Retorna o original se falhar
    }
  };

  // --- COMPONENTES AUXILIARES ---
  const CategoryTag = ({ name }: { name: string | null }) => {
    if (!name) {
      return <span className="text-xs text-muted/80">Sem Categoria</span>;
    }
    let colorClass = "bg-gray-500/10 text-gray-400";
    if (name.toLowerCase() === "salário")
      colorClass = "bg-blue-500/10 text-blue-400";
    if (name.toLowerCase() === "moradia")
      colorClass = "bg-orange-500/10 text-orange-400";
    if (name.toLowerCase() === "alimentação")
      colorClass = "bg-green-500/10 text-green-400";
    if (name.toLowerCase().includes("investimento"))
      colorClass = "bg-purple-500/10 text-purple-400";

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}
      >
        {name}
      </span>
    );
  };

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header Fixo */}
      <header className="flex flex-wrap items-end justify-between gap-4 whitespace-nowrap border-b border-white/10 px-10 py-4 sticky top-0 bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-2">
          <p className="text-white text-3xl font-bold">Lançamentos</p>
          <p className="text-muted text-base font-normal">
            Visualize e gerencie todas as suas transações
          </p>
        </div>
        <div className="flex flex-1 justify-start gap-3 flex-wrap sm:flex-nowrap sm:justify-end">
          <button
            onClick={() => setIsModalOpen(true)} // <-- Abre o modal em modo "Criar"
            className="flex min-w-[84px] max-w-[480px] grow sm:grow-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-background-dark text-sm font-bold shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          >
            <span className="truncate">+ Nova Transação</span>
          </button>
          <button
            onClick={() => navigate("/importar")}
            className="flex min-w-[84px] max-w-[480px] grow sm:grow-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-transparent border border-muted/50 text-muted hover:bg-white/5 hover:border-muted text-sm font-bold transition-colors"
          >
            <span className="truncate">Importar CSV/XLSX</span>
          </button>
        </div>
      </header>

      {/* Conteúdo da Página (com scroll) */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Botões de Filtro de Tipo (Dinâmicos) */}
          <div className="flex gap-3 pt-2 flex-wrap">
            <button
              onClick={() => handleFilterChange("type", "all")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filters.type === "all"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Tudo
            </button>
            <button
              onClick={() => handleFilterChange("type", "income")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filters.type === "income"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => handleFilterChange("type", "expense")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filters.type === "expense"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => handleFilterChange("type", "investment")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filters.type === "investment"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Investimentos
            </button>
          </div>

          {/* Painel de Filtros e Tabela */}
          <div className="w-full overflow-hidden rounded-xl glassmorphism">
            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4 border-b border-white/10">
              {/* Filtro de Busca */}
              <div className="relative lg:col-span-2">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  search
                </span>
                <input
                  className="h-10 w-full rounded-lg border-none bg-background-dark pl-10 pr-4 text-white placeholder-muted focus:ring-1 focus:ring-primary"
                  placeholder="Buscar por descrição ou categoria..."
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>

              {/* FILTRO DE MÊS/ANO (DINÂMICO) */}
              <select
                className="h-10 w-full rounded-lg border-none bg-background-dark text-white focus:ring-1 focus:ring-primary"
                value={filters.month_year}
                onChange={(e) =>
                  handleFilterChange("month_year", e.target.value)
                }
              >
                <option value="">Todo o Período</option>
                {availableMonths.map((monthStr) => (
                  <option key={monthStr} value={monthStr}>
                    {formatMonthYear(monthStr)}
                  </option>
                ))}
              </select>

              {/* Filtro de Tipo */}
              <select
                className="h-10 w-full rounded-lg border-none bg-background-dark text-white focus:ring-1 focus:ring-primary"
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                <option value="all">Todos os Tipos</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
                <option value="investment">Investimento</option>
              </select>
            </div>

            {/* Mensagem de Erro (se houver) */}
            {error && (
              <div className="p-4 text-center text-negative bg-negative/10">
                {error}
              </div>
            )}

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th
                      className="px-6 py-3 text-left font-medium text-muted"
                      scope="col"
                    >
                      Data
                    </th>
                    <th
                      className="px-6 py-3 text-left font-medium text-muted"
                      scope="col"
                    >
                      Descrição
                    </th>
                    <th
                      className="px-6 py-3 text-left font-medium text-muted"
                      scope="col"
                    >
                      Categoria
                    </th>
                    <th
                      className="px-6 py-3 text-left font-medium text-muted"
                      scope="col"
                    >
                      Tipo
                    </th>
                    <th
                      className="px-6 py-3 text-right font-medium text-muted"
                      scope="col"
                    >
                      Valor
                    </th>
                    <th
                      className="relative px-6 py-3 text-right font-medium text-muted"
                      scope="col"
                    >
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted">
                        Carregando transações...
                      </td>
                    </tr>
                  )}
                  {!loading && transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted">
                        Nenhuma transação encontrada para estes filtros.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-muted">
                          {format(
                            parseISO(tx.date + "T12:00:00"),
                            "dd/MM/yyyy",
                            {
                              locale: ptBR,
                            }
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                          {tx.description}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <CategoryTag name={tx.category_name} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-muted capitalize">
                          {tx.type}
                        </td>
                        <td
                          className={`whitespace-nowrap px-6 py-4 text-right font-semibold ${
                            tx.type === "income"
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {tx.type === "income" ? "+ " : "- "}
                          {formatCurrency(Math.abs(tx.value))}
                        </td>
                        {/* BOTÕES DE AÇÃO (LIGADOS) */}
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            onClick={() => handleEdit(tx)} // <-- LIGA O EDITAR
                            className="p-1 text-muted hover:text-white"
                          >
                            <span className="material-symbols-outlined text-base">
                              edit
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)} // <-- LIGA O APAGAR
                            className="p-1 text-muted hover:text-negative"
                          >
                            <span className="material-symbols-outlined text-base">
                              delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Sumário do Rodapé */}
            {summary && (
              <div className="grid grid-cols-1 gap-px border-t border-white/10 sm:grid-cols-3">
                <div className="flex items-center gap-4 bg-white/5 p-4">
                  <span className="material-symbols-outlined rounded-full bg-positive/10 p-2 text-positive">
                    arrow_upward
                  </span>
                  <div>
                    <p className="text-sm text-muted">Total de Receitas</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(summary.total_income)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4">
                  <span className="material-symbols-outlined rounded-full bg-negative/10 p-2 text-negative">
                    arrow_downward
                  </span>
                  <div>
                    <p className="text-sm text-muted">Total de Despesas</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(summary.total_expense)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4">
                  <span className="material-symbols-outlined rounded-full bg-blue-500/10 p-2 text-blue-400">
                    account_balance_wallet
                  </span>
                  <div>
                    <p className="text-sm text-muted">Saldo do Período</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(summary.balance)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Lançamento (com a nova prop) */}
      <QuickEntryModal
        isOpen={isModalOpen || !!editingTransaction}
        onClose={handleCloseModal}
        onSaveSuccess={handleSaveSuccess}
        transactionToEdit={editingTransaction}
        allowDateSelection={true}
      />
    </div>
  );
}
