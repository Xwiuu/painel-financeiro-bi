// frontend/src/components/GoalModal.tsx

import { useState, useEffect, type FormEvent } from "react";
import axios from "axios";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { parseISO } from "date-fns";

registerLocale("pt-BR", ptBR);

// --- TIPOS ---
interface Category {
  id: number;
  name: string;
}

interface GoalData {
  id: number;
  name: string;
  type: "saving" | "limit";
  target_amount: number;
  current_amount: number;
  period: "monthly" | "deadline";
  deadline: string | null; // "YYYY-MM-DD"
  category_id: number | null;
}

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  goalToEdit?: GoalData | null;
}

// --- URLs da API ---
const API_GOALS_URL = "http://127.0.0.1:8000/api/goals/";
const API_CATEGORIES_URL = "http://127.0.0.1:8000/api/categories/";

export function GoalModal({
  isOpen,
  onClose,
  onSaveSuccess,
  goalToEdit,
}: GoalModalProps) {
  const isEditMode = !!goalToEdit;

  // --- ESTADOS DO FORMULÁRIO ---
  const [name, setName] = useState("");
  const [type, setType] = useState<"saving" | "limit">("saving");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState(""); // Só para 'saving'
  const [period, setPeriod] = useState<"monthly" | "deadline">("deadline");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [categoryId, setCategoryId] = useState<string>(""); // Usamos string para o <select>

  // Estado para a lista de categorias
  const [categories, setCategories] = useState<Category[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca as categorias para o dropdown
  useEffect(() => {
    if (isOpen) {
      axios
        .get(API_CATEGORIES_URL)
        .then((response) => setCategories(response.data))
        .catch(() => setError("Não foi possível carregar as categorias."));
    }
  }, [isOpen]);

  // Popula o formulário se estiver em modo de edição
  useEffect(() => {
    if (isOpen && isEditMode && goalToEdit) {
      setName(goalToEdit.name);
      setType(goalToEdit.type);
      setTargetAmount(String(goalToEdit.target_amount));
      setCurrentAmount(String(goalToEdit.current_amount));
      setPeriod(goalToEdit.period);
      setCategoryId(String(goalToEdit.category_id || ""));
      setDeadline(
        goalToEdit.deadline ? parseISO(goalToEdit.deadline + "T12:00:00") : null
      );
    } else {
      // Reseta o formulário
      setName("");
      setType("saving");
      setTargetAmount("");
      setCurrentAmount("0");
      setPeriod("deadline");
      setCategoryId("");
      setDeadline(null);
    }
  }, [isOpen, isEditMode, goalToEdit]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validação
    if (!name || !targetAmount || parseFloat(targetAmount) <= 0) {
      setError("Nome e Valor Alvo (positivo) são obrigatórios.");
      setIsSaving(false);
      return;
    }

    // Monta o payload
    const payload = {
      name,
      type,
      target_amount: parseFloat(targetAmount),
      current_amount:
        type === "saving" ? parseFloat(currentAmount || "0") : 0.0,
      period,
      deadline:
        period === "deadline" && deadline
          ? deadline.toISOString().split("T")[0]
          : null,
      category_id: categoryId ? parseInt(categoryId) : null,
    };

    try {
      if (isEditMode) {
        // --- MODO EDIÇÃO (PUT) ---
        await axios.put(`${API_GOALS_URL}${goalToEdit!.id}`, payload);
      } else {
        // --- MODO CRIAÇÃO (POST) ---
        await axios.post(API_GOALS_URL, payload);
      }
      onSaveSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      setError("Falha ao salvar a meta.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="glassmorphism rounded-xl border border-white/10 p-6 w-full max-w-lg shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {isEditMode ? "Editar Meta" : "Criar Nova Meta"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de Meta */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted mb-2">
              Tipo da Meta
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "saving" | "limit")}
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            >
              <option value="saving">Poupança (Guardar dinheiro)</option>
              <option value="limit">Limite de Gasto (Orçamento)</option>
            </select>
          </div>

          {/* Nome da Meta */}
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-muted mb-2"
            >
              Nome da Meta
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
              placeholder={
                type === "saving"
                  ? "Ex: Viagem para a Europa"
                  : "Ex: Limite de Alimentação"
              }
            />
          </div>

          {/* Valor Alvo */}
          <div>
            <label
              htmlFor="targetAmount"
              className="block text-sm font-medium text-muted mb-2"
            >
              {type === "saving" ? "Valor Alvo (R$)" : "Limite Mensal (R$)"}
            </label>
            <input
              type="number"
              id="targetAmount"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
              placeholder={type === "saving" ? "Ex: 10000.00" : "Ex: 800.00"}
              step="0.01"
            />
          </div>

          {/* Valor Atual (Só para Poupança) */}
          <div style={{ display: type === "saving" ? "block" : "none" }}>
            <label
              htmlFor="currentAmount"
              className="block text-sm font-medium text-muted mb-2"
            >
              Valor Atual (R$)
            </label>
            <input
              type="number"
              id="currentAmount"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
              placeholder="Ex: 500.00"
              step="0.01"
            />
          </div>

          {/* Categoria */}
          <div className="md:col-span-2">
            <label
              htmlFor="category"
              className="block text-sm font-medium text-muted mb-2"
            >
              {type === "saving"
                ? "Categoria (Opcional)"
                : "Categoria do Limite"}
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            >
              <option value="">
                {type === "saving"
                  ? "Nenhuma (Geral)"
                  : "Selecione uma categoria..."}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Período
            </label>
            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value as "monthly" | "deadline")
              }
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            >
              <option value="deadline">Longo Prazo (com data final)</option>
              <option value="monthly">Mensal (recorrente)</option>
            </select>
          </div>

          {/* Data Final (Só para Longo Prazo) */}
          <div style={{ display: period === "deadline" ? "block" : "none" }}>
            <label
              htmlFor="deadline"
              className="block text-sm font-medium text-muted mb-2"
            >
              Data Final
            </label>
            <DatePicker
              id="deadline"
              selected={deadline}
              onChange={(d: Date | null) => setDeadline(d)}
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
              placeholderText="Ex: 31/12/2025"
            />
          </div>
        </div>

        {error && (
          <p className="text-negative text-sm mt-4 text-center">{error}</p>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="py-2 px-5 rounded-lg text-white bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="py-2 px-5 rounded-lg bg-primary text-background-dark font-bold hover:bg-opacity-80 transition-colors disabled:bg-muted/50"
          >
            {isSaving ? "Salvando..." : "Salvar Meta"}
          </button>
        </div>
      </form>
    </div>
  );
}
