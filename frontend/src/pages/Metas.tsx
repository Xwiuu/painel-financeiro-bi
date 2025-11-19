// frontend/src/pages/MetasPage.tsx
// VERSÃO FINAL: CRUD COMPLETO E UX DE APORTE DIRETO

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
// Importar o novo Modal
import { GoalModal } from "../components/GoalModal";

// --- DEFINIÇÃO DOS TIPOS (Baseado no schemas.py) ---
interface Goal {
  id: number;
  name: string;
  type: "saving" | "limit";
  target_amount: number;
  current_amount: number;
  period: "monthly" | "deadline";
  deadline: string | null; // "YYYY-MM-DD"
  progress_value: number;
  progress_percentage: number;
  category_name: string | null;
  // Precisamos do category_id para a edição
  category_id: number | null;
}

interface GoalsSummary {
  total_saved_current: number;
  total_saved_target: number;
  total_limit_spent: number;
  total_limit_target: number;
  active_goals_count: number;
  saving_goals_count: number;
  limit_goals_count: number;
}

type GoalFilter = "all" | "monthly" | "deadline";

const API_URL = "http://127.0.0.1:8000/api/goals/";

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

// --- COMPONENTES INTERNOS ---

// Card de Sumário (Total Economizado, Gastos Mensais, etc.)
const SummaryCard = ({
  title,
  value,
  subText,
  percentage,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  subText: string;
  percentage?: number;
  icon?: string;
  iconColor?: string;
}) => (
  <div className="glassmorphism rounded-xl p-5 border border-white/10">
    <p className="text-sm font-medium text-muted">{title}</p>
    <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <p className="text-sm text-muted">{subText}</p>
      {percentage !== undefined && (
        <span
          className={`flex items-center text-xs font-semibold ${
            iconColor || "text-yellow-400"
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {icon || "warning"}
          </span>
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  </div>
);

// Card de Meta Individual (Viagem, Limite de Gasto)
const GoalCard = ({
  goal,
  onEdit,
  onDelete,
  onContribute, // <-- NOVO PROP
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: (goalId: number) => void; // <-- TIPO NOVO
}) => {
  const {
    name,
    type,
    category_name,
    progress_value,
    target_amount,
    progress_percentage,
    period,
    deadline,
  } = goal;

  const isLimit = type === "limit";
  const isSaving = type === "saving"; // <-- NOVO: Variável para clareza
  const isExceeded = isLimit && progress_value > target_amount;

  let barColor = "bg-primary";
  let progressText = `${progress_percentage.toFixed(1)}% completo`;
  let textColor = "text-muted";

  if (isLimit) {
    if (progress_percentage > 90) barColor = "bg-yellow-400";
    if (isExceeded) {
      barColor = "bg-negative";
      progressText = `${progress_percentage.toFixed(0)}% (Excedido)`;
      textColor = "text-negative";
    }
  }

  let periodText = "Longo Prazo";
  if (period === "monthly") periodText = "Mensal";
  if (deadline) {
    try {
      const date = new Date(deadline + "T12:00:00");
      periodText = `até ${date.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      })}`;
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="glassmorphism group relative rounded-xl p-5 transition-all hover:border-white/20 border border-white/10">
      {/* Botões de Ação (agora ligados) */}
      <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* NOVO: Botão de Aporte (SÓ para metas 'saving') */}
        {isSaving && (
          <button
            onClick={() => onContribute(goal.id)} // <-- CHAMA A FUNÇÃO DE APORTE
            title="Adicionar Aporte"
            className="rounded-full p-1.5 hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-base text-primary">
              add_circle
            </span>
          </button>
        )}

        <button
          onClick={onEdit} // <-- LIGADO
          className="rounded-full p-1.5 hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-base text-muted">
            edit
          </span>
        </button>
        <button
          onClick={onDelete} // <-- LIGADO
          className="rounded-full p-1.5 hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-base text-muted">
            delete
          </span>
        </button>
      </div>

      {/* Título e Categoria */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-white">{name}</p>
          <span className="text-xs font-medium text-muted">
            {category_name || (type === "saving" ? "Poupança" : "Limite")}
          </span>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-white">
          <span>{formatCurrency(progress_value)}</span>
          <span className="text-muted">{formatCurrency(target_amount)}</span>
        </div>
        <div className="relative mt-1 h-2 w-full rounded-full bg-background-dark">
          <div
            className={`absolute h-2 rounded-full ${barColor}`}
            style={{ width: `${Math.min(progress_percentage, 100)}%` }}
          ></div>
        </div>
        <div className={`mt-2 flex justify-between text-xs ${textColor}`}>
          <span>{progressText}</span>
          <span className="text-muted">{periodText}</span>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export function MetasPage() {
  // --- ESTADOS ---
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Estados para controlar o Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // --- EFEITOS ---
  // 4. Renomeamos a função de busca
  const fetchGoalsPage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("filter", filter);
      }

      const response = await axios.get(API_URL, { params });
      setSummary(response.data.summary);
      setGoals(response.data.goals);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar metas:", err);
      setError("Não foi possível carregar as metas.");
    } finally {
      setLoading(false);
    }
  }, [filter]); // Recarrega os dados sempre que o 'filter' mudar

  useEffect(() => {
    fetchGoalsPage();
  }, [fetchGoalsPage]);

  // --- FUNÇÕES DE AÇÃO (Handlers) ---
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    fetchGoalsPage(); // Recarrega a página
  };

  const handleOpenCreate = () => {
    setEditingGoal(null); // Garante que não está em modo de edição
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    // setIsModalOpen(true) // Não é mais necessário por causa da linha 344
  };

  const handleDelete = async (goalId: number) => {
    if (window.confirm("Tem certeza que deseja apagar esta meta?")) {
      try {
        await axios.delete(`${API_URL}${goalId}`);
        fetchGoalsPage(); // Recarrega a página
      } catch (err) {
        console.error("Erro ao apagar meta:", err);
        setError("Não foi possível apagar a meta.");
      }
    }
  };

  // NOVA FUNÇÃO: Adicionar Aporte
  const handleAddContribution = async (goalId: number) => {
    // 1. Pede o valor ao usuário (usando um prompt simples)
    const amountStr = prompt("Insira o valor do aporte:");

    if (!amountStr) return; // Se o usuário cancelar

    // Tenta converter para float
    const amount = parseFloat(amountStr.replace(",", "."));

    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido. Insira um número positivo.");
      return;
    }

    // 2. Envia para o novo endpoint do backend
    try {
      // O backend espera o corpo como { "amount": 100.00 }
      await axios.post(`${API_URL}${goalId}/contribute`, { amount: amount });
      fetchGoalsPage(); // Recarrega a página para ver o novo progresso
    } catch (err) {
      console.error("Erro ao adicionar aporte:", err);
      setError("Falha ao adicionar aporte.");
    }
  };

  // --- RENDERIZAÇÃO ---
  const savedPercentage = summary?.total_saved_target
    ? (summary.total_saved_current / summary.total_saved_target) * 100
    : 0;
  const limitPercentage = summary?.total_limit_target
    ? (summary.total_limit_spent / summary.total_limit_target) * 100
    : 0;

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header Fixo */}
      <header className="flex flex-wrap items-end justify-between gap-4 whitespace-nowrap border-b border-white/10 px-10 py-4 sticky top-0 bg-background-dark/80 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Metas Financeiras</h1>
          <p className="text-base font-normal text-muted">
            Defina e acompanhe seus objetivos e limites mensais
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-muted/50 px-4 text-sm font-bold text-muted transition-colors hover:bg-white/5 hover:border-muted hover:text-white">
            <span className="truncate">Editar Limites</span>
          </button>
          <button
            onClick={handleOpenCreate} // <-- LIGADO
            className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold text-background-dark shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          >
            <span className="truncate">+ Nova Meta</span>
          </button>
        </div>
      </header>

      {/* Conteúdo da Página (com scroll) */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          {/* Botões de Filtro */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("monthly")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filter === "monthly"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              Mensais
            </button>
            <button
              onClick={() => setFilter("deadline")}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${
                filter === "deadline"
                  ? "bg-primary text-background-dark"
                  : "bg-white/10 text-muted hover:bg-white/20"
              }`}
            >
              De Longo Prazo
            </button>
          </div>

          {/* Seção de Resumo */}
          <section className="mt-10">
            <h3 className="text-lg font-bold leading-tight tracking-tight text-white">
              Resumo das Metas
            </h3>

            {loading && <p className="text-muted mt-4">Carregando resumo...</p>}
            {error && <p className="text-negative mt-4">{error}</p>}

            {summary && !loading && (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                  title="Total Economizado"
                  value={formatCurrency(summary.total_saved_current)}
                  subText={`de ${formatCurrency(summary.total_saved_target)}`}
                  percentage={savedPercentage}
                  icon="arrow_upward"
                  iconColor="text-positive"
                />
                <SummaryCard
                  title="Gastos Mensais"
                  value={formatCurrency(summary.total_limit_spent)}
                  subText={`Limite de ${formatCurrency(
                    summary.total_limit_target
                  )}`}
                  percentage={limitPercentage}
                  icon={limitPercentage > 90 ? "warning" : "task_alt"}
                  iconColor={
                    limitPercentage > 90 ? "text-yellow-400" : "text-positive"
                  }
                />
                <SummaryCard
                  title="Metas Ativas"
                  value={String(summary.active_goals_count)}
                  subText={`${summary.saving_goals_count} de Poupança, ${summary.limit_goals_count} de Limite`}
                />
              </div>
            )}
          </section>

          {/* Seção da Lista de Metas */}
          <section className="mt-10">
            <h3 className="text-lg font-bold leading-tight tracking-tight text-white">
              Lista de Metas
            </h3>

            {loading && <p className="text-muted mt-4">Carregando metas...</p>}

            {!loading && goals.length === 0 && (
              <p className="text-muted mt-4">
                Nenhuma meta encontrada para este filtro.
              </p>
            )}

            {goals.length > 0 && !loading && (
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleOpenEdit(goal)}
                    onDelete={() => handleDelete(goal.id)}
                    onContribute={handleAddContribution} // <-- CONECTADO
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 5. Renderiza o Modal */}
      <GoalModal
        // O modal abre se 'isModalOpen' (Novo) OU 'editingGoal' (Editar) for verdadeiro
        isOpen={isModalOpen || !!editingGoal}
        onClose={handleCloseModal}
        onSaveSuccess={handleSaveSuccess}
        // Converte o tipo Goal (com progresso) para GoalData (só o formulário)
        goalToEdit={
          editingGoal
            ? {
                id: editingGoal.id,
                name: editingGoal.name,
                type: editingGoal.type,
                target_amount: editingGoal.target_amount,
                current_amount: editingGoal.current_amount,
                period: editingGoal.period,
                deadline: editingGoal.deadline,
                category_id: editingGoal.category_id,
              }
            : null
        }
      />
    </div>
  );
}
