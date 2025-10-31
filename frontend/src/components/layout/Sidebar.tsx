// frontend/src/components/layout/Sidebar.tsx

// 1. Importa o NavLink para navegação sem refresh
import { NavLink } from 'react-router-dom'

// 2. Define o tipo para os links (baseado no seu HTML)
interface NavLinkItem {
  name: string
  href: string
  icon: string // Nome do ícone do Material Symbols
}

// 3. Nossos novos links
const navigation: NavLinkItem[] = [
  { name: 'Dashboard', href: '/', icon: 'dashboard' },
  { name: 'Lançamentos', href: '/lancamentos', icon: 'receipt_long' },
  { name: 'Metas', href: '/metas', icon: 'track_changes' },
  { name: 'Relatórios', href: '/relatorios', icon: 'bar_chart' },
  { name: 'Importar Dados', href: '/importar', icon: 'file_upload' },
  { name: 'Configurações', href: '/config', icon: 'settings' },
]

// 4. Helper para juntar classes (útil para o NavLink)
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function Sidebar() {
  return (
    // <aside> do seu HTML traduzido para JSX
    <aside className="w-64 flex-shrink-0 bg-background-dark border-r border-white/10 p-4 flex flex-col justify-between h-screen">
      <div className="flex flex-col gap-8">
        
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <svg
            className="text-primary size-8"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
              fill="currentColor"
              fillRule="evenodd"
            ></path>
          </svg>
          <span className="text-white text-lg font-bold">FinDash</span>
        </div>

        {/* Navegação */}
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              // 'end' é crucial para a Home (/) não ficar ativa sempre
              end={item.href === '/'}
              
              // Função de classe do NavLink (para o link ativo)
              className={({ isActive }) =>
                classNames(
                  isActive
                    ? 'bg-primary/20 text-primary' // Estilo ATIVO (do seu HTML)
                    : 'text-muted hover:bg-white/5 hover:text-white', // Estilo INATIVO
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200'
                )
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className="text-sm font-medium">{item.name}</p>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Perfil do Usuário (Rodapé da Sidebar) */}
      <div className="flex items-center gap-3 p-2">
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/50"
          data-alt="User avatar image"
          // Tradução do style="..." para JSX
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBiCemWmKihVHgkwqKpVzxln97Bs_xuWKnQo5j_31p4LzZaRkI1PvV1DLqlDpyggHWevFLDUVkT7puy_VYAekQuVSwS17K0PAYEkdZxFH0zEYR_rUaROqAR9hqv4JyyLOaGmIkmJz5IoV-ITZv0rnQzhJAuorYA29e3s91YA-ipQ94L9WeuRANW8tzrGzJJoouiGDNC1bcp1CtjD5_Z8Uuy2r166ZweB5dxE81mnX4C-vyBPApiowEf4135Da2fA-iDm7b4GxbtZA")' }}
        ></div>
        <div className="flex flex-col">
          <h1 className="text-white text-sm font-medium">Alex D.</h1>
          <p className="text-muted text-xs font-normal">alex.d@email.com</p>
        </div>
      </div>
    </aside>
  )
}