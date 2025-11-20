// frontend/src/components/CategoryModal.tsx

import { useState, useEffect, type FormEvent } from "react";
import axios from "axios";
import { isAxiosError } from "axios";

// Importa a URL centralizada
import { API_URL } from "../config";

// --- TIPOS ---
interface CategoryData {
  id?: number; // Opcional para criação (POST)
  name: string;
  keywords: string;
  // A API só precisa de name e keywords para update
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  // Se for nulo, estamos criando. Se tiver dados, estamos editando.
  categoryToEdit: CategoryData | null;
}

// --- URLs da API ---
// Agora construída dinamicamente com base no config
const CATEGORIES_URL = `${API_URL}/categories/`;

export function CategoryModal({
  isOpen,
  onClose,
  onSaveSuccess,
  categoryToEdit,
}: CategoryModalProps) {
  const isEditMode = !!categoryToEdit;

  // --- ESTADOS DO FORMULÁRIO ---
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Efeito para popular o formulário em modo de edição
  useEffect(() => {
    if (isOpen && isEditMode && categoryToEdit) {
      setName(categoryToEdit.name);
      setKeywords(categoryToEdit.keywords);
    } else if (isOpen) {
      // Reseta o formulário apenas quando o modal abre para criação
      setName("");
      setKeywords("");
    }
  }, [isOpen, isEditMode, categoryToEdit]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validação
    if (!name.trim() || !keywords.trim()) {
      setError("Nome e Palavras-chave são obrigatórios.");
      setIsSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      keywords: keywords.trim(),
    };

    try {
      if (isEditMode) {
        // --- MODO EDIÇÃO (PUT) ---
        await axios.put(`${CATEGORIES_URL}${categoryToEdit!.id}`, payload);
      } else {
        // --- MODO CRIAÇÃO (POST) ---
        await axios.post(CATEGORIES_URL, payload);
      }
      onSaveSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
      if (isAxiosError(err) && err.response && err.response.data.detail) {
        setError(err.response.data.detail); // Ex: "Categoria com este nome já existe"
      } else {
        setError("Falha ao salvar. Verifique os dados ou a conexão.");
      }
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
        className="glassmorphism rounded-xl border border-white/10 p-6 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {isEditMode ? "Editar Categoria" : "Adicionar Nova Categoria"}
        </h2>

        {/* Campo Nome */}
        <div className="mb-4">
          <label
            htmlFor="cat-name"
            className="block text-sm font-medium text-muted mb-2"
          >
            Nome da Categoria
          </label>
          <input
            type="text"
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            placeholder="Ex: Lazer"
          />
        </div>

        {/* Campo Palavras-chave */}
        <div className="mb-6">
          <label
            htmlFor="cat-keywords"
            className="block text-sm font-medium text-muted mb-2"
          >
            Palavras-chave (separadas por vírgula)
          </label>
          <input
            type="text"
            id="cat-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full rounded-lg border-none bg-background-dark text-white p-3 focus:ring-2 focus:ring-primary"
            placeholder="Ex: cinema, ifood, steam"
          />
        </div>

        {error && (
          <p className="text-negative text-sm mb-4 text-center">{error}</p>
        )}

        {/* Botões de Ação */}
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
            {isSaving ? "Salvando..." : "Salvar Categoria"}
          </button>
        </div>
      </form>
    </div>
  );
}
