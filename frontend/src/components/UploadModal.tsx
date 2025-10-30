import { useState, type ChangeEvent } from "react";
import axios, { isAxiosError } from "axios"; // <-- CORREÇÃO: Faltava o 'from'

// A URL da nossa API de importação
const API_URL = "http://127.0.0.1:8000/api/import/";

// Define as 'props' que o componente vai receber
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void; // Função para recarregar os dados
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecione um arquivo primeiro.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Chama o endpoint POST /api/import/
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload bem-sucedido:", response.data);
      onUploadSuccess(); // Avisa o App.tsx para recarregar os dados
      handleClose(); // Fecha o modal
    } catch (err) {
      console.error(err);

      // Com o 'isAxiosError' importado, isso agora funciona
      if (isAxiosError(err) && err.response) {
        // Se o backend mandou um detalhe (ex: "Coluna faltando"), mostre-o
        setError(err.response.data.detail || "Erro desconhecido no backend.");
      } else {
        // Erro de rede ou outro
        setError("Falha de rede. O backend está no ar?");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reseta o estado ao fechar
    setSelectedFile(null);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) {
    return null;
  }

  // Renderização do Modal (o pop-up)
  return (
    // Fundo escuro (overlay)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Conteúdo do Modal */}
      <div className="bg-dark-card p-6 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          Importar Novas Transações
        </h2>

        {/* Input de Arquivo */}
        <input
          type="file"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
          className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-dark-bg hover:file:bg-opacity-80"
        />

        {/* Mensagem de Erro (AGORA VAI MOSTRAR O ERRO REAL) */}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        {/* Prévia do arquivo selecionado */}
        {selectedFile && (
          <p className="text-text-secondary text-sm mt-2">
            Arquivo: {selectedFile.name}
          </p>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="py-2 px-4 rounded text-text-primary bg-text-secondary bg-opacity-30 hover:bg-opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="py-2 px-4 rounded bg-accent text-dark-bg font-bold hover:bg-opacity-80 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isUploading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
