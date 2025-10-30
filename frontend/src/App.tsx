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
// --- IMPORTAÇÃO NOVA ---
import { UploadModal } from "./components/UploadModal"; // Nosso novo modal

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
  date: string;
  income: number;
  expense: number;
  balance: number;
}

// --- CONFIGURAÇÃO DA API ---
const API_URL = "http://127.0.0.1:8000/api";
const PIE_COLORS = ["#c6d3a0", "#94aa6e", "#5f7f3d", "#3d5526"];

function App() {
  // --- ESTADO (State) ---
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [pieData, setPieData] = useState<CategoryExpense[]>([]);
  const [lineData, setLineData] = useState<BalanceOverTimePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- ESTADO NOVO PARA O MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- EFEITO (Effect) ---
  // A LÓGICA DE BUSCA FOI MOVIDA PARA UMA FUNÇÃO SEPARADA
  const fetchAllData = async () => {
    setLoading(true); // Ativa o "Carregando..."
    try {
      const [kpiRes, pieRes, lineRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/kpis`),
        axios.get(`${API_URL}/dashboard/chart/expenses-by-category`),
        axios.get(`${API_URL}/dashboard/chart/balance-over-time`),
      ]);
      setKpis(kpiRes.data);
      setPieData(pieRes.data);
      setLineData(lineRes.data);
      setError(null);
    } catch (err) {
      setError("Falha ao buscar dados da API. O backend está rodando?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Isso roda UMA VEZ quando o componente carrega
  useEffect(() => {
    fetchAllData(); // Chama a função na primeira carga
  }, []);

  // --- FUNÇÃO DE RECARGA ---
  // Esta função é chamada pelo Modal quando o upload dá certo
  const handleUploadSuccess = () => {
    console.log("Upload bem-sucedido! Recarregando dados...");
    fetchAllData(); // Busca os dados novamente
  };

  // --- RENDERIZAÇÃO ---
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-card p-2 border border-text-secondary rounded shadow-lg">
          <p className="text-text-primary">{label}</p>
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#e8efe2"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <p className="text-text-secondary">Carregando dados...</p>;
    }

    if (error) {
      return <p className="text-red-400">{error}</p>;
    }

    if (kpis) {
      return (
        <div className="w-full max-w-6xl mx-auto">
          {/* --- HEADER COM BOTÃO --- */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-text-primary">
              Meu Painel Financeiro
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-accent text-dark-bg font-bold py-2 px-4 rounded-lg hover:bg-opacity-80"
            >
              Importar Dados
            </button>
          </div>

          {/* Cards de KPI */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* ... (Os 4 cards continuam iguais) ... */}
            <div className="bg-dark-card p-4 rounded-lg shadow-lg">
              <h2 className="text-sm font-bold text-text-secondary uppercase">
                Receita Total
              </h2>
              <p className="text-3xl font-semibold text-green-400">
                {formatCurrency(kpis.total_income)}
              </p>
            </div>
            <div className="bg-dark-card p-4 rounded-lg shadow-lg">
              <h2 className="text-sm font-bold text-text-secondary uppercase">
                Despesa Total
              </h2>
              <p className="text-3xl font-semibold text-red-400">
                {formatCurrency(kpis.total_expense)}
              </p>
            </div>
            <div className="bg-dark-card p-4 rounded-lg shadow-lg">
              <h2 className="text-sm font-bold text-text-secondary uppercase">
                Investimentos
              </h2>
              <p className="text-3xl font-semibold text-blue-400">
                {formatCurrency(kpis.total_investment)}
              </p>
            </div>
            <div className="bg-dark-card p-4 rounded-lg shadow-lg">
              <h2 className="text-sm font-bold text-text-secondary uppercase">
                Saldo Atual
              </h2>
              <p className="text-3xl font-semibold text-accent">
                {formatCurrency(kpis.balance)}
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Gráfico de Pizza (Despesas) */}
            <div className="bg-dark-card p-4 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Gastos por Categoria
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {pieData.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "#e8efe2" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Linha (Evolução) */}
            <div className="bg-dark-card p-4 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Evolução Financeira
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#5f7f3d" />
                  <XAxis dataKey="date" stroke="#94aa6e" />
                  <YAxis stroke="#94aa6e" tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ color: "#e8efe2" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Saldo"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Receita"
                    stroke="#c6d3a0"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Despesa"
                    stroke="#ef4444"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-text-secondary">Nenhum dado encontrado.</p>;
  };

  return (
    // Fundo principal
    <div className="bg-dark-bg min-h-screen w-full pt-8 pb-8">
      {/* O MODAL DE UPLOAD RENDERIZADO (MAS ESCONDIDO) */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* O conteúdo da página */}
      {renderContent()}
    </div>
  );
}

export default App;
