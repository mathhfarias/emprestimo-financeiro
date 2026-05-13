import { LogOut, Menu, ShieldCheck } from 'lucide-react';
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
  const { user, profile, roleLabel, signOut } = useAuth();

  const displayName = profile?.name || user?.email || 'Usuário';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Menu className="lg:hidden" size={20} />

          <div>
            <p className="text-xs text-slate-500">Usuário logado</p>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                {displayName}
              </h2>

              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <ShieldCheck size={13} />
                {roleLabel}
              </span>
            </div>

            {user?.email && (
              <p className="mt-0.5 text-xs text-slate-400">
                {user.email}
              </p>
            )}
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
              `rounded-full px-3 py-1.5 text-xs font-semibold ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}