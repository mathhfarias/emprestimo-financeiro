import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { getClientById, inactivateClient } from '../services/clientsService.js';
import { listLoansByClient } from '../services/loansService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters.js';

export default function ClientDetails() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [clientData, loansData] = await Promise.all([getClientById(id), listLoansByClient(id)]);
      setClient(clientData);
      setLoans(loansData);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleInactivate() {
    try {
      await inactivateClient(id);
      await loadData();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando cliente...</p>;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!client) return null;

  const columns = [
    { key: 'created_at', header: 'Data', render: (row) => formatDate(row.created_at?.slice(0, 10)) },
    { key: 'principal_amount', header: 'Valor emprestado', render: (row) => formatCurrency(row.principal_amount) },
    { key: 'monthly_interest_rate', header: 'Juros', render: (row) => formatPercent(row.monthly_interest_rate) },
    { key: 'total_amount', header: 'Total', render: (row) => formatCurrency(row.total_amount) },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'actions', header: 'Ações', render: (row) => <Link className="font-semibold text-slate-900 hover:underline" to={`/emprestimos/${row.id}`}>Abrir</Link> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-500">Detalhes do cliente e histórico de empréstimos.</p>
        </div>
        <Button variant="secondary" onClick={handleInactivate}>Inativar cliente</Button>
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-3">
        <Info label="CPF/CNPJ" value={client.document} />
        <Info label="Telefone" value={client.phone} />
        <Info label="E-mail" value={client.email} />
        <Info label="Cidade/UF" value={`${client.city || '-'} / ${client.state || '-'}`} />
        <Info label="Endereço" value={client.address} />
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
          <div className="mt-1"><Badge status={client.status} /></div>
        </div>
        <div className="md:col-span-3">
          <Info label="Observações" value={client.notes} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Histórico de empréstimos</h2>
        <SimpleTable columns={columns} data={loans} emptyTitle="Nenhum empréstimo para este cliente" />
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value || '-'}</p>
    </div>
  );
}
