// frontend/src/components/layout/Sidebar.tsx

import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'

// Define o tipo para os links (mantido)
interface NavLinkItem {
  name: string
  href: string
  icon: string 
}

const API_URL = "http://127.0.0.1:8000/api";

// Nossos links (mantido)
const navigation: NavLinkItem[] = [
  { name: 'Dashboard', href: '/', icon: 'dashboard' },
  { name: 'Lançamentos', href: '/lancamentos', icon: 'receipt_long' },
  { name: 'Metas', href: '/metas', icon: 'track_changes' },
  { name: 'Relatórios', href: '/relatorios', icon: 'bar_chart' },
  { name: 'Importar Dados', href: '/importar', icon: 'file_upload' },
  { name: 'Configurações', href: '/config', icon: 'settings' },
]


// Helper para classes (mantido)
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function Sidebar() {
  const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);

  const fetchUncategorizedCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/transactions/uncategorized-count`);
      setUncategorizedCount(response.data.count);
    } catch (error) {
      console.error("Erro ao buscar contagem de não categorizados:", error);
    }
  };

  useEffect(() => {
    fetchUncategorizedCount();
    const interval = setInterval(fetchUncategorizedCount, 60000); 
    return () => clearInterval(interval);
  }, []); 

  return (
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
              end={item.href === '/'}
              className={({ isActive }) =>
                classNames(
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted hover:bg-white/5 hover:text-white',
                  'flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200' 
                )
              }
            >
              <div className='flex items-center gap-3'>
                <span className="material-symbols-outlined">{item.icon}</span>
                <p className="text-sm font-medium">{item.name}</p>
              </div>
              
              {/* Badge de Contagem (Lançamentos) */}
              {item.href === '/lancamentos' && uncategorizedCount > 0 && (
                  <span className='inline-flex items-center justify-center h-5 px-2 text-xs font-bold rounded-full bg-negative text-white'>
                      {uncategorizedCount}
                  </span>
              )}

            </NavLink>
          ))}
        </nav>
      </div>

      {/* 🛑 PERFIL DO USUÁRIO REMOVIDO 🛑 */}
      {/*
      <div className="flex items-center gap-3 p-2">
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/50"
          data-alt="User avatar image"
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBiCemWmKihVHgkwqKpVzxln97Bs_xuWKnQo5j_31p4LzZaRkI1PvV1DLqlDpyggHWevFLDUVkT7puy_VYAekQuVSwS17K0PAYEkdZxFH0zEYR_rUaROqAR9hqv4JyyLOaGmIkmJz5IoV-ITZv0rnQzhJAuorYA29e3s91YA-ipQ94L9WeuRANW8tzrGzJJoouiGDNC1bcp1CtjD5_Z8Uuy2r166ZweB5dxE81mnX4C-vyBPApiowEf4135Da2fA-iDm7b4GxbtZA")' }}
        ></div>
        <div className="flex flex-col">
          <h1 className="text-white text-sm font-medium">Alex D.</h1>
          <p className="text-muted text-xs font-normal">alex.d@email.com</p>
        </div>
      </div>
      */}
      
    </aside>
  )
}