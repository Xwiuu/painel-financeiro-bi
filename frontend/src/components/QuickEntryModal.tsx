// frontend/src/components/QuickEntryModal.tsx

import { useState, useEffect, type FormEvent } from "react";
import axios from "axios";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { parseISO } from "date-fns";

registerLocale("pt-BR", ptBR);

const API_CREATE_URL = "http://127.0.0.1:8000/api/transactions/add-simple"; // ← URL correta
const API_UPDATE_URL = "http://127.0.0.1:8000/api/transactions";

interface TransactionData {
  id: number;
  date: string;
  description: string;
  value: number;
  type: "income" | "expense" | "investment";
  category_name: string | null;
}

// 1. ATUALIZAR AS PROPS
interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  transactionToEdit?: TransactionData | null;
  allowDateSelection?: boolean; // <-- NOVA PROP (opcional)
}

export function QuickEntryModal({
  isOpen,
  onClose,
  onSaveSuccess,
  transactionToEdit,
  allowDateSelection = false, // <-- VALOR PADRÃO (falso)
}: QuickEntryModalProps) {
  const isEditMode = !!transactionToEdit;

  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("expense");
  const [categoryName, setCategoryName] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && transactionToEdit) {
      // Modo Edição: preenche com os dados existentes
      setDescription(transactionToEdit.description);
      setValue(String(Math.abs(transactionToEdit.value)));
      setType(transactionToEdit.type);
      setCategoryName(transactionToEdit.category_name || "");
      setDate(parseISO(transactionToEdit.date + "T12:00:00"));
    } else {
      // Modo Criação: reseta para o padrão
      setDescription("");
      setValue("");
      setType("expense");
      setCategoryName("");
      setDate(new Date()); // Sempre começa com 'hoje'
    }
  }, [isOpen, isEditMode, transactionToEdit]); // Roda sempre que o modal abre

  // 2. ATUALIZAR O HANDLESUBMIT
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!description || !value || parseFloat(value) <= 0 || !date) {
      setError("Descrição, Data e Valor (positivo) são obrigatórios.");
      setIsSaving(false);
      return;
    }

    // Formata a data para "YYYY-MM-DD"
    const formattedDate = date.toISOString().split("T")[0];

    try {
      if (isEditMode) {
        // --- MODO DE EDIÇÃO (PUT) ---
        // (Já enviava a data, continua igual)
        const updatePayload = {
          description: description,
          value: parseFloat(value),
          type: type,
          category_name: categoryName || null,
          date: formattedDate,
        };
        await axios.put(
          `${API_UPDATE_URL}/${transactionToEdit!.id}`,
          updatePayload
        );
      } else {
        // --- MODO DE CRIAÇÃO (POST) ---
        // (Agora também envia a data!)
        const createPayload = {
          description: description,
          value: parseFloat(value),
          type: type,
          category_name: categoryName || null,
          date: formattedDate, // <-- MUDANÇA PRINCIPAL AQUI
        };
        await axios.post(API_CREATE_URL, createPayload);
      }

      onSaveSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      setError("Falha ao salvar. Verifique os dados ou se a categoria existe.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  // 3. ATUALIZAR O JSX
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="glassmorphism rounded-xl border border-white/10 p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {/* O título agora é mais genérico no modo de criação */}
          {isEditMode ? "Editar Lançamento" : "Novo Lançamento"}
        </h2>

        {/* Seletor de Tipo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-muted mb-2">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
            <option value="investment">Investimento</option>
          </select>
        </div>

        {/* CAMPO DE DATA (LÓGICA ATUALIZADA) */}
        {/* Mostra o campo se: (estiver em Modo Edição) OU (allowDateSelection for true) */}
        {(isEditMode || allowDateSelection) && (
          <div className="mb-4">
            <label
              htmlFor="date"
              className="block text-sm font-medium text-muted mb-2"
            >
              Data
            </label>
            <DatePicker
              id="date"
              selected={date}
              onChange={(d: Date | null) => {
                if (d) setDate(d);
              }}
              locale="pt-BR"
              dateFormat="dd/MM/yyyy"
              className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Campo Descrição */}
        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-muted mb-2"
          >
            Descrição
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            placeholder="Ex: Café na padaria"
          />
        </div>

        {/* ... (Resto do arquivo: Valor, Categoria, Botões) ... */}
        {/* Campo Valor */}
        <div className="mb-4">
          <label
            htmlFor="value"
            className="block text-sm font-medium text-muted mb-2"
          >
            Valor (R$)
          </label>
          <input
            type="number"
            id="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            placeholder="Ex: 5.50"
            step="0.01"
          />
        </div>

        {/* Campo Categoria (Opcional) */}
        <div className="mb-6">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-muted mb-2"
          >
            Categoria (Opcional)
          </label>
          <input
            type="text"
            id="category"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            placeholder="Ex: Alimentação (ou deixe em branco para auto-tag)"
          />
        </div>

        {error && (
          <p className="text-negative text-sm mb-4 text-center">{error}</p>
        )}

        <div className="flex justify-end gap-4">
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
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
