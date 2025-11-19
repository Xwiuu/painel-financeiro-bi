# 🚀 Painel Financeiro BI (V1 Concluído)

Este é um projeto de dashboard de Finanças Pessoais construído com uma arquitetura modular moderna (Frontend/Backend separados), focando em visualização dinâmica de dados e usabilidade (UX).

## 📊 Funcionalidades Chave (V1)

- **Dashboard Interativo:** KPIs (Receita, Despesa, Saldo) calculados dinamicamente com filtros de data (Hoje, Mês, Ano).
- **Gráficos:** Visualização de Evolução do Saldo (Gráfico de Linha) e Distribuição de Despesas (Gráfico de Pizza).
- **Gestão de Transações:** CRUD (Criação, Edição, Exclusão) completo na página "Lançamentos" e entrada rápida na Home.
- **Categorias:** CRUD completo para gerenciamento de categorias e palavras-chave (auto-tagging).
- **Metas:** Criação de metas de Poupança e Limite de Gastos, com cálculo de progresso em tempo real e funcionalidade de Adicionar Aporte.
- **Importação de Dados:** Suporte a upload de arquivos `.CSV` e `.XLSX`.

## ⚙️ Stack Tecnológico

| Componente         | Tecnologia          | Detalhe                                   |
| :----------------- | :------------------ | :---------------------------------------- |
| **Frontend**       | React               | Desenvolvimento rápido e reativo.         |
| **Tooling**        | Vite                | Servidor de desenvolvimento e Bundler.    |
| **Estilo/UI**      | Tailwind CSS        | Framework utilitário para design moderno. |
| **Visualização**   | Recharts            | Biblioteca de gráficos.                   |
| **Backend**        | Python (FastAPI)    | API rápida e robusta com tipagem forte.   |
| **Banco de Dados** | SQLite / SQLAlchemy | Persistência de dados leve e ORM.         |

## 🛠️ Como Rodar o Projeto Localmente

O projeto é dividido em duas pastas: `backend/` (Python) e `frontend/` (React/TS).

### 1. Backend (API)

Execute os comandos dentro da pasta `backend/`.

1.  **Instalar Dependências:**

    ```bash
    # Se você está usando um ambiente virtual (venv)
    pip install -r requirements.txt
    # (ou instale manualmente: fastapi, uvicorn, sqlalchemy, pandas, etc.)
    ```

2.  **Iniciar o Servidor:**
    ```bash
    uvicorn app.main:app --reload
    ```
    _(O servidor estará rodando em http://127.0.0.1:8000)_

### 2. Frontend (Aplicação Web)

Execute os comandos dentro da pasta `frontend/`.

1.  **Instalar Dependências:**

    ```bash
    npm install
    ```

2.  **Iniciar a Aplicação:**
    ```bash
    npm run dev
    ```
    _(A aplicação estará acessível, por exemplo, em http://localhost:5173)_

---

## ☁️ Notas de Deploy

- A conexão com o banco de dados está definida em `backend/app/database.py` (padrão: SQLite).
- Para produção, é altamente recomendável migrar para um banco de dados mais robusto (PostgreSQL, MySQL) e ajustar a variável `SQLALCHEMY_DATABASE_URL`.
