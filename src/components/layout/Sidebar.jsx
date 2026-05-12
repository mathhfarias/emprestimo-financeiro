import { NavLink } from 'react-router-dom';
import { BarChart3, Banknote, LayoutDashboard, Settings, Users } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/emprestimos', label: 'Empréstimos', icon: Banknote },
  { to: '/financeiro', label: 'Financeiro', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-slate-100 bg-white px-4 py-6 lg:block">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-black text-slate-900">LoanControl</h1>
        <p className="text-xs text-slate-500">Controle interno de empréstimos</p>
      </div>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
