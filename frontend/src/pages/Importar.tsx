// frontend/src/pages/ImportarPage.tsx

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
} from "react";
import axios, { isAxiosError } from "axios";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importa os modais que vamos precisar
import { QuickEntryModal } from "../components/QuickEntryModal";

// --- URLs da API ---
const API_IMPORT_URL = "http://127.0.0.1:8000/api/import/";
const API_TRANSACTIONS_URL = "http://127.0.0.1:8000/api/transactions";
const API_MONTHS_URL = "http://127.0.0.1:8000/api/transactions/months";

// --- DEFINIÇÃO DOS TIPOS ---
interface Transaction {
  id: number;
  date: string;
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
  type: string;
  month_year: string;
}

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

// Componente para o "Tag" de Categoria
const CategoryTag = ({ name }: { name: string | null }) => {
  if (!name) {
    return <span className="text-xs text-muted/80">Sem Categoria</span>;
  }
  let colorClass = "bg-gray-500/20 text-gray-400"; // Cor do seu design (tags)
  if (name.toLowerCase() === "salário")
    colorClass = "bg-green-500/20 text-green-400";
  if (name.toLowerCase() === "alimentação")
    colorClass = "bg-red-500/20 text-red-400";
  if (name.toLowerCase() === "transporte")
    colorClass = "bg-red-500/20 text-red-400";
  if (name.toLowerCase() === "lazer") colorClass = "bg-red-500/20 text-red-400";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}
    >
      {name}
    </span>
  );
};

// --- COMPONENTE PRINCIPAL ---
export function ImportarPage() {
  // --- ESTADOS DA TABELA DE HISTÓRICO ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "all",
    month_year: "",
  });
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // --- ESTADOS DO MODAL (EDITAR/APAGAR) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // --- ESTADOS DO UPLOAD ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  // Ref para o input de arquivo escondido
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FUNÇÕES DE BUSCA DE DADOS (HISTÓRICO) ---
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.month_year) params.append("month_year", filters.month_year);

      const response = await axios.get(`${API_TRANSACTIONS_URL}/all`, {
        params,
      });
      setTransactions(response.data.transactions);
      setSummary(response.data.summary);
      setTableError(null);
    } catch (err) {
      console.error(err); // O 'err' é usado aqui
      setTableError("Falha ao buscar transações.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchMonths = async () => {
    try {
      const response = await axios.get(API_MONTHS_URL);
      setAvailableMonths(response.data);
    } catch (err) {
      console.error("Erro ao buscar meses:", err); // O 'err' é usado aqui
    }
  };

  // --- EFEITOS (TRIGGERS) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  useEffect(() => {
    fetchMonths();
  }, []); // Roda 1 vez

  // --- FUNÇÕES DE AÇÃO (UPLOAD) ---
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Por favor, selecione um arquivo primeiro.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(API_IMPORT_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadSuccess(
        `Sucesso! ${response.data.rows_imported} linhas importadas.`
      );
      setSelectedFile(null); // Limpa o arquivo
      // Recarrega a tabela e os meses
      fetchTransactions();
      fetchMonths();
    } catch (err) {
      // O 'err' é usado aqui
      if (isAxiosError(err) && err.response) {
        setUploadError(
          err.response.data.detail || "Erro desconhecido no backend."
        );
      } else {
        setUploadError("Falha de rede. O backend está no ar?");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // --- FUNÇÕES DE AÇÃO (TABELA) ---
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    fetchTransactions();
    fetchMonths();
  };

  const handleDelete = async (transactionId: number) => {
    if (window.confirm("Tem certeza que deseja apagar este lançamento?")) {
      try {
        await axios.delete(`${API_TRANSACTIONS_URL}/${transactionId}`);
        fetchTransactions();
        fetchMonths();
      } catch {
        // <-- 1. CORREÇÃO AQUI (Linha 229 no seu erro)
        setTableError("Falha ao apagar transação.");
      }
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  // Formata "YYYY-MM" para "Outubro / 2025"
  const formatMonthYear = (monthString: string) => {
    try {
      const [year, month] = monthString.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, "LLLL / y", { locale: ptBR });
    } catch {
      // <-- 2. CORREÇÃO AQUI (Linha 212 no seu erro)
      return monthString;
    }
  };

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header Fixo */}
      <header className="flex flex-wrap items-end justify-between gap-4 whitespace-nowrap border-b border-white/10 px-10 py-4 sticky top-0 bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-bold text-white">Importar e Histórico</p>
          <p className="text-base font-normal text-muted">
            Gerencie seus lançamentos e histórico de transações.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold text-background-dark shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          >
            <span className="truncate">+ Importar Planilha</span>
          </button>
          <button className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-muted/50 px-4 text-sm font-bold text-muted transition-colors hover:bg-white/5 hover:border-muted hover:text-white">
            <span className="truncate">Exportar CSV</span>
          </button>
        </div>
      </header>

      {/* Conteúdo da Página (com scroll) */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* SEÇÃO DE UPLOAD */}
          <section
            onClick={() => fileInputRef.current?.click()}
            className="glassmorphism rounded-xl p-4 cursor-pointer"
          >
            <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-primary/20 px-6 py-14">
              <span className="material-symbols-outlined text-5xl text-primary">
                cloud_upload
              </span>
              <div className="flex max-w-[480px] flex-col items-center gap-2 text-center">
                <p className="text-lg font-bold leading-tight tracking-[-0.015em] text-white">
                  {selectedFile
                    ? `Arquivo: ${selectedFile.name}`
                    : "Arraste aqui sua planilha .CSV ou .XLSX"}
                </p>
                <p className="text-sm font-normal leading-normal text-muted">
                  Ou clique para selecionar um arquivo. As colunas devem conter:
                  Data, Categoria, Tipo, Valor e Descrição
                </p>
              </div>
              {/* Input de arquivo real (escondido) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx"
                className="hidden"
              />
              {/* Botão de Upload (só aparece se um arquivo for selecionado) */}
              {selectedFile && !isUploading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  className="mt-2 flex h-10 min-w-[84px] cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-background-dark shadow-lg shadow-primary/30 transition-transform hover:scale-105"
                >
                  Confirmar Envio
                </button>
              )}
              {isUploading && <p className="text-primary mt-2">Enviando...</p>}
              {/* Mensagens de Erro/Sucesso */}
              {uploadError && (
                <p className="text-negative mt-2 text-sm">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="text-positive mt-2 text-sm">{uploadSuccess}</p>
              )}
            </div>
          </section>

          {/* SEÇÃO DE HISTÓRICO */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">
              Histórico de Lançamentos
            </h2>
            {/* Filtros da Tabela */}
            <div className="glassmorphism flex flex-wrap items-center gap-4 rounded-xl p-4">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  search
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-white/10 bg-background-dark pl-10 text-white placeholder-muted focus:ring-2 focus:ring-primary"
                  placeholder="Buscar por descrição..."
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  className="h-10 appearance-none rounded-lg border border-white/10 bg-background-dark pl-4 pr-10 text-white focus:ring-2 focus:ring-primary"
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <option value="all">Tipo (Todos)</option>
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                  <option value="investment">Investimento</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  className="h-10 appearance-none rounded-lg border border-white/10 bg-background-dark pl-4 pr-10 text-white focus:ring-2 focus:ring-primary"
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
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  expand_more
                </span>
              </div>
              <button
                onClick={() =>
                  setFilters({ search: "", type: "all", month_year: "" })
                }
                className="h-10 rounded-lg border border-muted/50 bg-transparent px-4 text-sm font-medium text-muted transition-colors hover:bg-white/10"
              >
                Limpar Filtros
              </button>
            </div>

            {/* Tabela e Sumário */}
            <div className="glassmorphism overflow-hidden rounded-xl">
              {tableError && (
                <div className="p-4 text-center text-negative bg-negative/10">
                  {tableError}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-primary/20 text-muted">
                    <tr>
                      <th className="px-6 py-3 font-medium">Data</th>
                      <th className="px-6 py-3 font-medium">Categoria</th>
                      <th className="px-6 py-3 font-medium">Descrição</th>
                      <th className="px-6 py-3 font-medium">Tipo</th>
                      <th className="px-6 py-3 font-medium text-right">
                        Valor
                      </th>
                      <th className="px-6 py-3 font-medium text-center">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10">
                    {loading && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted">
                          Carregando histórico...
                        </td>
                      </tr>
                    )}
                    {!loading && transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted">
                          Nenhum dado encontrado para este período.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-primary/10 transition-colors"
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            {format(
                              parseISO(tx.date + "T12:00:00"),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <CategoryTag name={tx.category_name} />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {tx.description}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 capitalize">
                            {/* Design usa tags coloridas para o tipo */}
                            {tx.type === "income" ? (
                              <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                Receita
                              </span>
                            ) : tx.type === "expense" ? (
                              <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                                Despesa
                              </span>
                            ) : (
                              <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-400">
                                Investimento
                              </span>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-6 py-4 text-right font-medium ${
                              tx.type === "income"
                                ? "text-positive"
                                : "text-negative"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}{" "}
                            {formatCurrency(Math.abs(tx.value))}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEdit(tx)}
                                className="text-gray-400 hover:text-white"
                              >
                                <span className="material-symbols-outlined text-xl">
                                  edit
                                </span>
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="text-gray-400 hover:text-negative"
                              >
                                <span className="material-symbols-outlined text-xl">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-primary/20 px-6 py-3">
                <p className="text-sm text-gray-500">
                  Mostrando 1–{transactions.length} de {transactions.length}{" "}
                  registros
                </p>
                <div className="flex items-center gap-2">
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white">
                    <span className="material-symbols-outlined">
                      chevron_left
                    </span>
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white">
                    <span className="material-symbols-outlined">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO DE SUMÁRIO DO RODAPÉ */}
          {summary && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="glassmorphism rounded-xl p-6">
                <p className="text-sm text-gray-400">
                  Total de Receitas no Período
                </p>
                <p className="mt-1 text-3xl font-bold text-positive">
                  {formatCurrency(summary.total_income)}
                </p>
              </div>
              <div className="glassmorphism rounded-xl p-6">
                <p className="text-sm text-gray-400">Total de Despesas</p>
                <p className="mt-1 text-3xl font-bold text-negative">
                  - {formatCurrency(Math.abs(summary.total_expense))}
                </p>
              </div>
              <div className="glassmorphism rounded-xl p-6">
                <p className="text-sm text-gray-400">Saldo Final</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {formatCurrency(summary.balance)}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO (reutilizado) */}
      <QuickEntryModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        onSaveSuccess={handleSaveSuccess}
        transactionToEdit={editingTransaction}
      />
    </div>
  );
}
