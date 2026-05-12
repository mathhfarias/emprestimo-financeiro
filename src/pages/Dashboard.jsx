import { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CalendarClock, CircleDollarSign, Users, WalletCards } from 'lucide-react';
import FinancialCard from '../components/cards/FinancialCard.jsx';
import Badge from '../components/ui/Badge.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { getDashboardData } from '../services/dashboardService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { getFriendlySupabaseError } from '../services/supabase.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setData(await getDashboardData());
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando dashboard...</p>;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;

  const metrics = data.metrics;

  const columns = [
    { key: 'client', header: 'Cliente', render: (row) => row.loan?.client?.name || '-' },
    { key: 'installment_number', header: 'Parcela', render: (row) => `#${row.installment_number}` },
    { key: 'amount', header: 'Valor', render: (row) => formatCurrency(row.amount) },
    { key: 'due_date', header: 'Vencimento', render: (row) => formatDate(row.due_date) },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral dos empréstimos, recebimentos e parcelas em aberto.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FinancialCard title="Total emprestado" value={formatCurrency(metrics.totalBorrowed)} icon={Banknote} />
        <FinancialCard title="Total recebido" value={formatCurrency(metrics.totalReceived)} icon={CircleDollarSign} />
        <FinancialCard title="Total em aberto" value={formatCurrency(metrics.totalOpen)} icon={WalletCards} />
        <FinancialCard title="Clientes cadastrados" value={metrics.clientsCount} icon={Users} />
        <FinancialCard title="Empréstimos ativos" value={metrics.activeLoansCount} icon={CalendarClock} />
        <FinancialCard title="Parcelas vencidas" value={metrics.overdueInstallmentsCount} icon={AlertTriangle} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Próximos vencimentos</h2>
          <p className="text-sm text-slate-500">Parcelas pendentes e atrasadas ordenadas por vencimento.</p>
        </div>
        <SimpleTable
          columns={columns}
          data={data.upcomingInstallments}
          emptyTitle="Nenhum vencimento encontrado"
          emptyDescription="Quando existirem parcelas pendentes, elas aparecerão aqui."
        />
      </section>
    </div>
  );
}
