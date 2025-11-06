// frontend/src/components/QuickEntryModal.tsx

import { useState, useEffect, type FormEvent } from "react";
import axios from "axios";
// Importa o DatePicker
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { parseISO } from "date-fns";

registerLocale("pt-BR", ptBR);

// API URLs
const API_CREATE_URL = "http://127.0.0.1:8000/api/transactions/add";
const API_UPDATE_URL = "http://127.0.0.1:8000/api/transactions"; // /:id será adicionado

// Tipo da Transação (simplificado, como vem da página)
interface TransactionData {
  id: number;
  date: string; // "YYYY-MM-DD"
  description: string;
  value: number;
  type: "income" | "expense" | "investment";
  category_name: string | null;
}

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  // Recebe a transação para editar
  transactionToEdit?: TransactionData | null;
}

export function QuickEntryModal({
  isOpen,
  onClose,
  onSaveSuccess,
  transactionToEdit,
}: QuickEntryModalProps) {
  // Verifica se estamos em modo de Edição
  const isEditMode = !!transactionToEdit;

  // --- ESTADO DO FORMULÁRIO ---
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("expense");
  const [categoryName, setCategoryName] = useState("");
  // Estado para a data
  const [date, setDate] = useState<Date>(new Date());

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useEffect para popular o formulário em modo de edição
  useEffect(() => {
    if (isEditMode && transactionToEdit) {
      // Se estamos editando, preenchemos o formulário com os dados
      setDescription(transactionToEdit.description);
      setValue(String(Math.abs(transactionToEdit.value))); // Usa valor absoluto
      setType(transactionToEdit.type);
      setCategoryName(transactionToEdit.category_name || "");
      // parseISO converte a string "YYYY-MM-DD" de volta para um objeto Date
      // Adicionamos um fuso horário local para evitar bugs de "um dia a menos"
      setDate(parseISO(transactionToEdit.date + "T12:00:00"));
    } else {
      // Se estamos criando, resetamos para o padrão
      setDescription("");
      setValue("");
      setType("expense");
      setCategoryName("");
      setDate(new Date()); // Padrão é hoje
    }
  }, [isOpen, isEditMode, transactionToEdit]); // Roda sempre que o modal abre

  // --- FUNÇÃO DE SUBMISSÃO ÚNICA E CORRETA ---
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validação
    // O campo 'date' só é obrigatório no modo de edição, mas
    // no modo de criação ele sempre tem um valor (new Date())
    if (!description || !value || parseFloat(value) <= 0 || !date) {
      setError("Descrição, Data e Valor (positivo) são obrigatórios.");
      setIsSaving(false);
      return;
    }

    try {
      if (isEditMode) {
        // --- MODO DE EDIÇÃO (PUT) ---
        // O payload de edição (TransactionUpdate) aceita a data
        const updatePayload = {
          description: description,
          value: parseFloat(value),
          type: type,
          category_name: categoryName || null,
          date: date.toISOString().split("T")[0], // Formata como "YYYY-MM-DD"
        };
        await axios.put(
          `${API_UPDATE_URL}/${transactionToEdit!.id}`, // O '!' diz ao TS que 'transactionToEdit' não é nulo aqui
          updatePayload
        );
      } else {
        // --- MODO DE CRIAÇÃO (POST) ---
        // O payload de criação (QuickEntryCreate) NÃO aceita a data
        // (ele usa a data de hoje no backend)
        const createPayload = {
          description: description,
          value: parseFloat(value),
          type: type,
          category_name: categoryName || null,
        };
        await axios.post(API_CREATE_URL, createPayload);
      }

      onSaveSuccess(); // Avisa a página pai
      handleClose(); // Fecha o modal
    } catch (err) {
      console.error(err);
      setError("Falha ao salvar. Verifique os dados ou se a categoria existe.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reseta o formulário
    setError(null);
    setIsSaving(false);
    onClose(); // Chama a função onClose (que vai resetar o estado da página pai)
  };

  if (!isOpen) {
    return null;
  }

  // Renderização do Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <form
        // Usamos a função de submit correta
        onSubmit={handleSubmit}
        className="glassmorphism rounded-xl border border-white/10 p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {isEditMode ? "Editar Lançamento" : "Novo Lançamento Rápido"}
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

        {/* CAMPO DE DATA (Só aparece no modo de EDIÇÃO) */}
        {isEditMode && (
          <div className="mb-4">
            <label
              htmlFor="date"
              className="block text-sm font-medium text-muted mb-2"
            >
              Data
            </label>
            {/* Erro de tipo corrigido aqui */}
            <DatePicker
              id="date"
              selected={date}
              onChange={(d: Date | null) => {
                if (d) {
                  // Só atualiza o estado se 'd' não for nulo
                  setDate(d);
                }
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
