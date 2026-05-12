import { LogOut, Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Button from '../ui/Button.jsx';

const mobileLinks = [
  ['/dashboard', 'Dashboard'],
  ['/clientes', 'Clientes'],
  ['/emprestimos', 'Empréstimos'],
  ['/financeiro', 'Financeiro'],
];

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Menu className="lg:hidden" size={20} />
          <div>
            <p className="text-xs text-slate-500">Usuário logado</p>
            <h2 className="text-sm font-bold text-slate-900">{user?.email}</h2>
          </div>
        </div>
        <Button variant="secondary" onClick={signOut}>
          <LogOut size={16} /> Sair
        </Button>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
        {mobileLinks.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-xs font-semibold ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
