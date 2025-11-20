// frontend/src/pages/Home.tsx
// VERSÃO 100% CONECTADA E COM FILTROS DE DATA ATIVADOS

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
} from "date-fns";
import { QuickEntryModal } from "../components/QuickEntryModal";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";

registerLocale("pt-BR", ptBR);

// --- DEFINIÇÃO DOS TIPOS (MANTIDOS) ---
interface KpiData {
  total_income: number;
  total_expense: number;
  total_investment: number;
  balance: number;
  income_change_percentage: number;
  expense_change_percentage: number;
  investment_change_percentage: number;
  balance_change_percentage: number;
}
interface CategoryExpense {
  name: string;
  value: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
interface BalanceOverTimePoint {
  date: string; // "YYYY-MM-DD"
  income: number;
  expense: number;
  balance: number;
}
interface TransactionDetail {
  id: number;
  date: string;
  description: string;
  value: number;
  type: "income" | "expense" | "investment";
  category_name: string | null;
}

// --- CONFIGURAÇÃO DA API (AGORA USANDO CAMINHO RELATIVO /api) ---
// Em deploy com Vercel, o domínio é o mesmo. O Vercel fará o rewrite de /api para o Backend.
const API_URL =
  import.meta.env.MODE === "development" ? "http://127.0.0.1:8000/api" : "/api"; // <--- NOVO: Usa o caminho relativo /api

const PIE_COLORS = ["#ff4560", "#008FFB", "#FEB019", "#775DD0"];

// --- INÍCIO DO COMPONENTE ---
export function HomePage() {
  // --- ESTADO (State) ---
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [pieData, setPieData] = useState<CategoryExpense[]>([]);
  const [lineData, setLineData] = useState<BalanceOverTimePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<
    TransactionDetail[]
  >([]);

  // NOVOS ESTADOS PARA FILTRO DE DATA
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;
  const [activeFilter, setActiveFilter] = useState<
    "all" | "today" | "month" | "year"
  >("all");

  // --- FUNÇÕES DE LÓGICA DE FILTRO ---
  const setPeriodFromButton = (filter: "all" | "today" | "month" | "year") => {
    setActiveFilter(filter);
    const now = new Date();

    let newStartDate: Date | null = null;
    let newEndDate: Date | null = null;

    if (filter === "today") {
      newStartDate = startOfDay(now);
      newEndDate = endOfDay(now);
    } else if (filter === "month") {
      newStartDate = startOfMonth(now);
      newEndDate = endOfMonth(now);
    } else if (filter === "year") {
      newStartDate = startOfYear(now);
      newEndDate = endOfYear(now);
    } else {
      // "all" ou reset
      setDateRange([null, null]);
      return;
    }

    // O DatePicker espera que a data seja do tipo Date
    setDateRange([newStartDate, newEndDate]);
  };

  // --- FUNÇÃO QUE BUSCA OS DADOS (AGORA COM FILTRO) ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    // 5. Formata e anexa as datas à URL se existirem
    if (startDate) {
      params.append("start_date", format(startDate, "yyyy-MM-dd"));
    }
    if (endDate) {
      params.append("end_date", format(endDate, "yyyy-MM-dd"));
    }
    const queryString = params.toString();

    try {
      const [kpiRes, pieRes, lineRes, recentRes] = await Promise.all([
        // 6. Envia os parâmetros para TODOS os endpoints
        axios.get(`${API_URL}/dashboard/kpis/?${queryString}`),
        axios.get(
          `${API_URL}/dashboard/chart/expenses-by-category?${queryString}`
        ),
        axios.get(
          `${API_URL}/dashboard/chart/balance-over-time?${queryString}`
        ),
        axios.get(`${API_URL}/transactions/recent?${queryString}`),
      ]);
      setKpis(kpiRes.data);
      setPieData(pieRes.data);
      setLineData(lineRes.data);
      setRecentTransactions(recentRes.data);
      setError(null);
    } catch (err) {
      setError(
        "Falha ao buscar dados da API. Verifique a variável VITE_API_BASE_URL no seu ambiente de deploy."
      );
      console.error("Erro na Home Page ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]); // 7. Recarrega a função se as datas mudarem

  // Roda no carregamento e sempre que as datas mudam
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ... (funções auxiliares de formatação e Tooltip permanecem as mesmas) ...
  const handleSaveSuccess = () => {
    setIsModalOpen(false);
    fetchAllData();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const totalExpenses = pieData.reduce((acc, entry) => acc + entry.value, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let formattedLabel = label;
      if (label && typeof label === "string" && label.includes("-")) {
        try {
          const [year, month, day] = label.split("-").map(Number);
          const dateObj = new Date(year, month - 1, day);
          formattedLabel = format(dateObj, "dd/MM/yyyy");
        } catch {
          formattedLabel = label;
        }
      }
      return (
        <div className="glassmorphism p-2 border border-white/10 rounded shadow-lg">
          {label && <p className="text-muted">{formattedLabel}</p>}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((pld: any) => (
            <p key={pld.name} style={{ color: pld.color }}>
              {pld.name}: {formatCurrency(pld.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatDateTick = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      return format(dateObj, "dd/MM");
    } catch {
      return dateStr;
    }
  };

  // ... (Estados de Loading/Error permanecem) ...
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-center h-screen">
        <p className="text-muted text-xl">Carregando dados...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-center h-screen">
        <p className="text-negative text-xl">{error}</p>
      </div>
    );
  }
  if (!kpis) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-center h-screen">
        <p className="text-muted text-xl">Nenhum dado encontrado.</p>
      </div>
    );
  }

  // Estado de Sucesso (kpis existem)
  return (
    <div className="flex-1 flex flex-col h-screen relative">
      {/* Botão Flutuante (Permanece o mesmo) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-110 hover:shadow-primary/50"
        aria-label="Adicionar novo lançamento"
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </button>

      {/* Modal (Permanece o mesmo) */}
      <QuickEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Header (MANTIDO) */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-10 py-4 sticky top-0 bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-muted text-sm font-medium">Saldo Atual</h2>
          <p className="text-primary text-3xl font-bold tracking-tight">
            {formatCurrency(kpis.balance)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center justify-center rounded-full h-10 w-10 text-muted hover:text-white hover:bg-white/10 transition-all duration-200 hover:shadow-glow-primary-sm">
            <span className="material-symbols-outlined text-2xl">
              notifications
            </span>
          </button>
        </div>
      </header>

      {/* Conteúdo principal com scroll */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-8">
          {/* FILTROS DE PERÍODO (AGORA FUNCIONAIS) */}
          <div className="flex items-center gap-4 text-sm font-medium">
            <button
              onClick={() => setPeriodFromButton("today")}
              className={`${
                activeFilter === "today"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted hover:text-white"
              } transition-colors pb-2 px-1`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodFromButton("month")}
              className={`${
                activeFilter === "month"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted hover:text-white"
              } transition-colors pb-2 px-1`}
            >
              Mês
            </button>
            <button
              onClick={() => setPeriodFromButton("year")}
              className={`${
                activeFilter === "year"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted hover:text-white"
              } transition-colors pb-2 px-1`}
            >
              Ano
            </button>
            <div className="flex-1"></div>

            {/* Seletor de Período (Customizado) */}
            <div className="flex items-center gap-2 text-muted hover:text-white transition-colors">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update as [Date | null, Date | null]);
                  setActiveFilter("all"); // Define como custom
                }}
                isClearable={true}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecionar Período"
                customInput={
                  <button
                    className={`flex items-center gap-2 pb-2 px-1 transition-colors ${
                      activeFilter === "all"
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      calendar_today
                    </span>
                    <span>
                      {startDate && endDate
                        ? `${format(startDate, "dd/MM/yy")} - ${format(
                            endDate,
                            "dd/MM/yy"
                          )}`
                        : "Selecionar Período"}
                    </span>
                  </button>
                }
              />
            </div>
          </div>

          {/* Cards de KPI (AGORA COM DADOS E PORCENTAGENS REAIS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Saldo Atual */}
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Saldo Atual</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.balance)}
              </p>
              <p
                className={`${
                  kpis.balance_change_percentage >= 0
                    ? "text-positive"
                    : "text-negative"
                } text-sm font-medium`}
              >
                {kpis.balance_change_percentage > 0 && "+"}
                {kpis.balance_change_percentage.toFixed(1)}%
              </p>
            </div>

            {/* KPI 2: Receitas */}
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Receitas</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.total_income)}
              </p>
              <p
                className={`${
                  kpis.income_change_percentage >= 0
                    ? "text-positive"
                    : "text-negative"
                } text-sm font-medium`}
              >
                {kpis.income_change_percentage > 0 && "+"}
                {kpis.income_change_percentage.toFixed(1)}%
              </p>
            </div>

            {/* KPI 3: Despesas */}
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Despesas</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.total_expense)}
              </p>
              <p
                className={`${
                  kpis.expense_change_percentage <= 0
                    ? "text-positive"
                    : "text-negative"
                } text-sm font-medium`}
              >
                {kpis.expense_change_percentage > 0 && "+"}
                {kpis.expense_change_percentage.toFixed(1)}%
              </p>
            </div>

            {/* KPI 4: Investimentos */}
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Investimentos</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.total_investment)}
              </p>
              <p
                className={`${
                  kpis.investment_change_percentage >= 0
                    ? "text-positive"
                    : "text-negative"
                } text-sm font-medium`}
              >
                {kpis.investment_change_percentage > 0 && "+"}
                {kpis.investment_change_percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gráfico de Linha (Dinâmico) */}
            <div className="lg:col-span-3 glassmorphism rounded-xl p-6 flex flex-col">
              <p className="text-white text-lg font-medium">
                Evolução do Saldo
              </p>
              <p className="text-muted text-sm">
                {startDate && endDate
                  ? `${format(startDate, "dd/MM/yyyy")} a ${format(
                      endDate,
                      "dd/MM/yyyy"
                    )}`
                  : "Todo o período"}
              </p>
              <div className="flex-1 mt-4 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.1)"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#A0A0A0"
                      tickFormatter={formatDateTick}
                    />
                    <YAxis
                      stroke="#A0A0A0"
                      tickFormatter={(val) => `R$ ${val / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: "#E0E0E0" }} />
                    <defs>
                      <linearGradient
                        id="balance-gradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#00ff9d"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#00ff9d"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="Saldo"
                      stroke="#00ff9d"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#00ff9d", strokeWidth: 2 }}
                      fill="url(#balance-gradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Receita"
                      stroke="#c6d3a0"
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Despesa"
                      stroke="#ff4560"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Pizza (Dinâmico) */}
            <div className="lg:col-span-2 glassmorphism rounded-xl p-6 flex flex-col">
              <p className="text-white text-lg font-medium">
                Despesas por Categoria
              </p>
              <p className="text-muted text-sm">Este mês</p>
              <div className="flex-1 flex items-center justify-center my-4 min-h-[200px]">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill="#8884d8"
                      paddingAngle={5}
                      labelLine={false}
                    >
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {pieData.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#A0A0A0"
                      fontSize="12"
                      fontWeight="medium"
                    >
                      Total
                    </text>
                    <text
                      x="50%"
                      y="50%"
                      dy={20}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="16"
                      fontWeight="bold"
                    >
                      {`R$${(totalExpenses / 1000).toFixed(1)}k`}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* LEGENDA DINÂMICA (Baseada no pieData) */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {pieData.length > 0 ? (
                  pieData.map((entry, index) => {
                    const percentage =
                      totalExpenses > 0
                        ? (entry.value / totalExpenses) * 100
                        : 0;
                    const color = PIE_COLORS[index % PIE_COLORS.length];

                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        ></span>
                        <span
                          className="truncate text-white"
                          title={entry.name}
                        >
                          {entry.name} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted col-span-2 text-center">
                    Nenhuma despesa no período.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Últimas Transações (COM DADOS REAIS) */}
          <div className="glassmorphism rounded-xl p-6">
            <h2 className="text-white text-lg font-bold mb-4">
              Últimas Transações
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-muted">
                  <tr>
                    <th className="py-3 px-4 font-medium">Data</th>
                    <th className="py-3 px-4 font-medium">Categoria</th>
                    <th className="py-3 px-4 font-medium">Descrição</th>
                    <th className="py-3 px-4 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="py-4 px-4 whitespace-nowrap text-white">
                        {format(
                          new Date(tx.date + "T12:00:00"),
                          "dd MMM, yyyy"
                        )}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {tx.category_name || "Sem Categoria"}
                      </td>
                      <td
                        className="py-4 px-4 truncate max-w-xs text-white"
                        title={tx.description}
                      >
                        {tx.description}
                      </td>
                      <td
                        className={`py-4 px-4 text-right font-medium ${
                          tx.type === "income"
                            ? "text-positive"
                            : "text-negative"
                        }`}
                      >
                        {tx.type === "income" ? "+ " : "- "}
                        {formatCurrency(Math.abs(tx.value))}
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 px-4 text-center text-muted"
                      >
                        Nenhuma transação recente encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
