import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Dados da sessão e boas práticas de segurança.</p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sessão autenticada</h2>
            <p className="mt-1 text-sm text-slate-500">E-mail: {user?.email}</p>
            <p className="mt-1 text-sm text-slate-500">Nunca coloque a service role key no front-end. Use apenas a anon key com RLS ativo.</p>
            <Button className="mt-5" variant="secondary" onClick={signOut}>Sair da conta</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
