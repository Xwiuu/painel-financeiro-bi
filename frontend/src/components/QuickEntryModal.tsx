// frontend/src/components/QuickEntryModal.tsx

import { useState, type FormEvent } from "react";
import axios from "axios";

// A URL da nossa nova API
const API_URL = "http://127.0.0.1:8000/api/transactions/add";

// Define as 'props' que o componente vai receber
interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // Função para recarregar o dashboard
}

export function QuickEntryModal({
  isOpen,
  onClose,
  onSaveSuccess,
}: QuickEntryModalProps) {
  // --- ESTADO DO FORMULÁRIO ---
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("expense"); // 'expense' como padrão
  const [categoryName, setCategoryName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault(); // Impede o recarregamento da página
    setIsSaving(true);
    setError(null);

    // Validação simples
    if (!description || !value || parseFloat(value) <= 0) {
      setError("Descrição e Valor (positivo) são obrigatórios.");
      setIsSaving(false);
      return;
    }

    try {
      // 1. Monta o JSON para enviar (baseado no 'schemas.py')
      const payload = {
        description: description,
        value: parseFloat(value),
        type: type,
        category_name: categoryName || null, // Envia 'null' se estiver vazio
      };

      // 2. Chama o endpoint POST /api/transactions/add
      await axios.post(API_URL, payload);

      // 3. Deu certo!
      onSaveSuccess(); // Avisa o Home.tsx para recarregar os dados
      handleClose(); // Fecha o modal
    } catch (err) {
      console.error(err);
      setError("Falha ao salvar. O backend está no ar?");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reseta o formulário ao fechar
    setDescription("");
    setValue("");
    setType("expense");
    setCategoryName("");
    setError(null);
    setIsSaving(false);
    onClose();
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) {
    return null;
  }

  // Renderização do Modal (baseado no seu design 'image_e74d9c.png')
  return (
    // Fundo escuro (overlay)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      {/* Conteúdo do Modal (Glassmorphism) */}
      <form
        onSubmit={handleSubmit}
        className="glassmorphism rounded-xl border border-white/10 p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          Novo Lançamento Rápido
        </h2>

        {/* Seletor de Tipo (Despesa / Receita / Investimento) */}
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

        {/* Mensagem de Erro */}
        {error && (
          <p className="text-negative text-sm mb-4 text-center">{error}</p>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4">
          <button
            type="button" // Impede o 'submit' do formulário
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
