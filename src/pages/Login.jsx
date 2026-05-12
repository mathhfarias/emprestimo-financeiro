import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getFriendlySupabaseError } from '../services/supabase.js';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      <section className="hidden items-center justify-center bg-gradient-to-br from-slate-950 to-slate-800 p-12 text-white lg:flex">
        <div className="max-w-md">
          <div className="mb-6 inline-flex rounded-2xl bg-white/10 p-4">
            <Landmark size={34} />
          </div>
          <h1 className="text-4xl font-black leading-tight">Controle financeiro interno, seguro e organizado.</h1>
          <p className="mt-4 text-slate-300">Gerencie clientes, empréstimos, parcelas, pagamentos e relatórios com Supabase e React.</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-slate-900">Entrar no sistema</h2>
          <p className="mt-1 text-sm text-slate-500">Use o e-mail e senha cadastrados no Supabase Auth.</p>

          {error && <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="mt-6 space-y-4">
            <Input label="E-mail" type="email" name="email" value={form.email} onChange={handleChange} required />
            <Input label="Senha" type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </section>
    </main>
  );
}
