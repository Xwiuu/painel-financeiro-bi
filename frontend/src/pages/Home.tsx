// frontend/src/pages/Home.tsx
// VERSÃO 100% CORRIGIDA (com modal e botão flutuante)

import { useState, useEffect } from "react";
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
import { format } from "date-fns";
import { QuickEntryModal } from "../components/QuickEntryModal";
// A importação 'HiPlus' que não estava sendo usada foi removida.

// --- DEFINIÇÃO DOS TIPOS ---
interface KpiData {
  total_income: number;
  total_expense: number;
  total_investment: number;
  balance: number;
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
interface RecentTransaction {
  date: string;
  category: string;
  description: string;
  value: number;
  type: "income" | "expense";
}

// --- CONFIGURAÇÃO DA API ---
const API_URL = "http://127.0.0.1:8000/api";
const PIE_COLORS = ["#ff4560", "#008FFB", "#FEB019", "#775DD0"]; // Cores do seu design

// --- INÍCIO DO COMPONENTE ---
export function HomePage() {
  // --- ESTADO (State) ---
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [pieData, setPieData] = useState<CategoryExpense[]>([]);
  const [lineData, setLineData] = useState<BalanceOverTimePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- MOCK DATA PARA A TABELA (Baseado no seu HTML) ---
  const [recentTransactions] = useState<RecentTransaction[]>([
    {
      date: "15 Jul, 2024",
      category: "Receita",
      description: "Salário Mensal",
      value: 5500.0,
      type: "income",
    },
    {
      date: "14 Jul, 2024",
      category: "Lazer",
      description: "Ingressos Cinema",
      value: -85.0,
      type: "expense",
    },
    {
      date: "13 Jul, 2024",
      category: "Comida",
      description: "Supermercado do Mês",
      value: -754.9,
      type: "expense",
    },
  ]);

  // --- EFEITO (Effect) ---
  // Função que busca TODOS os dados do dashboard (SEM FILTRO)
  const fetchAllData = async () => {
    setLoading(true);

    try {
      const [kpiRes, pieRes, lineRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/kpis`),
        axios.get(`${API_URL}/dashboard/chart/expenses-by-category`),
        axios.get(`${API_URL}/dashboard/chart/balance-over-time`),
      ]);
      setKpis(kpiRes.data);
      setPieData(pieRes.data);
      setLineData(lineRes.data); // Salva os dados da linha
      setError(null);
    } catch (err) {
      setError("Falha ao buscar dados da API. O backend está rodando?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Roda UMA VEZ quando a página carrega
  useEffect(() => {
    fetchAllData();
  }, []); // <-- Array vazio, roda só uma vez

  // --- FUNÇÕES DE RENDERIZAÇÃO ---

  const handleSaveSuccess = () => {
    setIsModalOpen(false); // Fecha o modal
    fetchAllData(); // Recarrega os dados do dashboard
  };

  // Formata R$
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Calcula o total de despesas (para a legenda da pizza)
  const totalExpenses = pieData.reduce((acc, entry) => acc + entry.value, 0);

  // Tooltip customizado (fundo de vidro)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Tenta formatar a data SE for um label do gráfico de linha (que vem como "YYYY-MM-DD")
      let formattedLabel = label;
      if (label && typeof label === "string" && label.includes("-")) {
        try {
          const [year, month, day] = label.split("-").map(Number);
          // new Date() espera meses 0-11, por isso 'month - 1'
          const dateObj = new Date(year, month - 1, day);
          formattedLabel = format(dateObj, "dd/MM/yyyy");
        } catch {
          formattedLabel = label; // Fallback se a data for inválida
        }
      }

      return (
        <div className="glassmorphism p-2 border border-white/10 rounded shadow-lg">
          {/* Só mostra o label se ele existir (para o gráfico de linha) */}
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

  // Formata a data para o Eixo X (ex: "15/07")
  const formatDateTick = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      return format(dateObj, "dd/MM");
    } catch {
      return dateStr; // Fallback
    }
  };

  // --- RENDERIZAÇÃO (JSX) ---

  // Estado de Carregamento
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-center h-screen">
        <p className="text-muted text-xl">Carregando dados...</p>
      </div>
    );
  }

  // Estado de Erro
  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex justify-center items-center h-screen">
        <p className="text-negative text-xl">{error}</p>
      </div>
    );
  }

  // Se 'kpis' for nulo (APÓS loading e sem erro)
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
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-background-dark shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-110 hover:shadow-primary/50"
        aria-label="Adicionar novo lançamento"
      >
        {/* Ícone do seu design (se 'HiPlus' não funcionar, troque para 'add') */}
        <span className="material-symbols-outlined text-4xl">add</span>
      </button>

      {/* O Modal (Renderizado mas escondido) */}
      <QuickEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
      />
      {/* <header> (O Header do Saldo Atual) */}
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
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-transparent hover:border-primary/50 transition-all duration-200 hover:shadow-glow-primary-sm"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBjXXlC2cgP2I8MRs9fgURnXoSWRhsmNXtTbAwkTtjix-IOjGXjL-94xU-feJZrY9VzeAR_tKm0Bm6DNieuE46FnMP8C9anpP_hwkvWmSKIupQMQkSQSDmKoltLWy0b1gbw0JIPeq-EPjO3eteapwhYe9s2pzQ7YHjQzCVHkyvR5oLjWz0lu1ORv8mupV5CNAwVvPHCcXM-aZO4QJwbCsEi3BD45mSMrgT86kgSoEmfcmmZDrQP0wXufONCIPa3SzN9XQyYXTY5Wg")',
            }}
          ></div>
        </div>
      </header>

      {/* Conteúdo principal com scroll */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Filtros de Período (SIMPLIFICADO - SEM CALENDÁRIO) */}
          <div className="flex items-center gap-4 text-sm font-medium">
            <button className="text-primary border-b-2 border-primary pb-2 px-1">
              Hoje
            </button>
            <button className="text-muted hover:text-white transition-colors pb-2 px-1">
              Mês
            </button>
            <button className="text-muted hover:text-white transition-colors pb-2 px-1">
              Ano
            </button>
            <div className="flex-1"></div>
            <button className="flex items-center gap-2 text-muted hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">
                calendar_today
              </span>
              <span>Selecionar Período</span>
            </button>
          </div>

          {/* Cards de KPI (100% DINÂMICOS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Saldo Atual</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.balance)}
              </p>
              <p className="text-positive text-sm font-medium">+1.8%</p>{" "}
              {/* Mockado */}
            </div>
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Receitas</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.total_income)}
              </p>
              <p className="text-positive text-sm font-medium">+5.2%</p>{" "}
              {/* Mockado */}
            </div>
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Despesas</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.total_expense)}
              </p>
              <p className="text-negative text-sm font-medium">-2.1%</p>{" "}
              {/* Mockado */}
            </div>
            <div className="glassmorphism rounded-xl p-6 border border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-glow-primary-sm">
              <p className="text-muted text-base font-medium">Investimentos</p>
              <p className="text-white text-3xl font-bold my-2">
                {formatCurrency(kpis.total_investment)}
              </p>
              <p className="text-positive text-sm font-medium">+8.9%</p>{" "}
              {/* Mockado */}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gráfico de Linha (Dinâmico) */}
            <div className="lg:col-span-3 glassmorphism rounded-xl p-6 flex flex-col">
              <p className="text-white text-lg font-medium">
                Evolução do Saldo
              </p>
              <p className="text-muted text-sm">Últimos 30 dias</p>
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
                      tickFormatter={formatDateTick} // <-- APLICADA A FORMATAÇÃO
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
                    {/* LINHAS DE RECEITA E DESPESA */}
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
                      stroke="#ff4560" // Cor 'negative'
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
                      {/* Total de despesas agora vem do 'totalExpenses' */}
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

          {/* Tabela de Últimas Transações (com Mock Data) */}
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
                  {recentTransactions.map((tx, index) => (
                    <tr
                      key={index}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="py-4 px-4 whitespace-nowrap text-white">
                        {tx.date}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {tx.category || "Sem Categoria"}
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} // --- FIM DO COMPONENTE DE FUNÇÃO ---
