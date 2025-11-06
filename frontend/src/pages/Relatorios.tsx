// frontend/src/pages/RelatoriosPage.tsx

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
// Importações do DatePicker
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
// Importações do Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

registerLocale("pt-BR", ptBR);

// --- TIPOS ---
interface ReportData {
  name: string;
  value: number;
}

type ReportFilter = "expenses" | "income";

const API_URL = "http://127.0.0.1:8000/api/reports";
const BAR_COLORS = ["#008FFB", "#00E396", "#FEB019", "#FF4560", "#775DD0"];

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

// Tooltip customizado para os gráficos (fundo de vidro)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glassmorphism p-2 border border-white/10 rounded shadow-lg">
        <p className="text-muted">{label}</p>
        <p className="text-white font-bold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// --- COMPONENTE PRINCIPAL ---
export function RelatoriosPage() {
  // --- ESTADOS ---
  const [data, setData] = useState<ReportData[]>([]);
  const [filter, setFilter] = useState<ReportFilter>("expenses");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [startDate, endDate] = dateRange;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- EFEITOS (BUSCA DE DADOS) ---
  const fetchReportData = useCallback(async () => {
    setLoading(true);

    // Define qual endpoint chamar
    let endpoint = "";
    if (filter === "expenses") {
      endpoint = `${API_URL}/expenses-by-category`;
    } else {
      // (No futuro, podemos adicionar /income-by-category)
      setError("Relatório de Receitas ainda não implementado.");
      setData([]);
      setLoading(false);
      return;
    }

    try {
      // Monta os parâmetros de data
      const params = new URLSearchParams();
      if (startDate) {
        params.append("start_date", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        params.append("end_date", format(endDate, "yyyy-MM-dd"));
      }

      const response = await axios.get(endpoint, { params });
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar relatório:", err);
      setError("Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
    }
  }, [filter, startDate, endDate]); // Recarrega se o filtro ou datas mudarem

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header Fixo */}
      <header className="flex flex-wrap items-end justify-between gap-4 whitespace-nowrap border-b border-white/10 px-10 py-4 sticky top-0 bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-base font-normal text-muted">
            Analise a fundo suas finanças
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* Filtro de Calendário (DatePicker) */}
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => {
              setDateRange(update as [Date | null, Date | null]);
            }}
            isClearable={true}
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            placeholderText="Todo o período"
            customInput={
              <button className="flex h-10 items-center gap-2 rounded-lg border border-muted/50 px-4 text-sm font-bold text-muted transition-colors hover:bg-white/5 hover:border-muted hover:text-white">
                <span className="material-symbols-outlined text-xl">
                  calendar_today
                </span>
                <span>
                  {startDate && endDate
                    ? `${format(startDate, "dd/MM/yy")} - ${format(
                        endDate,
                        "dd/MM/yy"
                      )}`
                    : "Todo o período"}
                </span>
              </button>
            }
          />
        </div>
      </header>

      {/* Conteúdo da Página (com scroll) */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          {/* Botões de Filtro (Tipo de Relatório) */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("expenses")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filter === "expenses"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Despesas por Categoria
            </button>
            <button
              onClick={() => setFilter("income")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filter === "income"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Receitas por Categoria
            </button>
          </div>

          {/* Seção do Gráfico */}
          <section className="mt-10">
            <h3 className="text-lg font-bold leading-tight tracking-tight text-white">
              {filter === "expenses"
                ? "Despesas por Categoria"
                : "Receitas por Categoria"}
            </h3>

            {/* Container do Gráfico */}
            <div className="mt-4 glassmorphism rounded-xl p-6 border border-white/10 min-h-[400px]">
              {loading && (
                <div className="flex h-[400px] items-center justify-center">
                  <p className="text-muted">Carregando relatório...</p>
                </div>
              )}

              {error && (
                <div className="flex h-[400px] items-center justify-center">
                  <p className="text-negative">{error}</p>
                </div>
              )}

              {!loading && !error && data.length === 0 && (
                <div className="flex h-[400px] items-center justify-center">
                  <p className="text-muted">
                    Nenhum dado encontrado para este período.
                  </p>
                </div>
              )}

              {!loading && !error && data.length > 0 && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={data}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    layout="vertical" // Gráfico de barras horizontais
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.1)"
                      horizontal={false} // Remove linhas horizontais
                    />
                    {/* Eixo Y (Nomes das Categorias) */}
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#A0A0A0"
                      width={120} // Aumenta o espaço para o nome
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* Eixo X (Valores em R$) */}
                    <XAxis
                      type="number"
                      stroke="#A0A0A0"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => formatCurrency(val)}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
