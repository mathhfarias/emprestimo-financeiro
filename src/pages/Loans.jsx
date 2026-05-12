import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import LoanForm from '../components/forms/LoanForm.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { listClients } from '../services/clientsService.js';
import { createLoanWithInstallments, listLoans } from '../services/loansService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters.js';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ status: '', clientId: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(customFilters = filters) {
    try {
      setError('');
      const [loansData, clientsData] = await Promise.all([listLoans(customFilters), listClients()]);
      setLoans(loansData);
      setClients(clientsData.filter((client) => client.status === 'active'));
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    }
  }

  async function handleSubmit(payload) {
    try {
      setLoading(true);
      await createLoanWithInstallments(payload);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    loadData(nextFilters);
  }

  const columns = [
    { key: 'client', header: 'Cliente', render: (row) => row.client?.name || '-' },
    { key: 'principal_amount', header: 'Emprestado', render: (row) => formatCurrency(row.principal_amount) },
    { key: 'monthly_interest_rate', header: 'Juros', render: (row) => formatPercent(row.monthly_interest_rate) },
    { key: 'installments_count', header: 'Parcelas' },
    { key: 'total_amount', header: 'Total a receber', render: (row) => formatCurrency(row.total_amount) },
    { key: 'first_due_date', header: '1º vencimento', render: (row) => formatDate(row.first_due_date) },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    { key: 'actions', header: 'Ações', render: (row) => <Link className="font-semibold text-slate-900 hover:underline" to={`/emprestimos/${row.id}`}>Detalhes</Link> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Empréstimos</h1>
          <p className="text-sm text-slate-500">Cadastre empréstimos e acompanhe o status de cada contrato.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Novo empréstimo</Button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2">
        <Select label="Filtrar por cliente" name="clientId" value={filters.clientId} onChange={handleFilterChange}>
          <option value="">Todos</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </Select>
        <Select label="Filtrar por status" name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">Todos</option>
          <option value="active">Ativo</option>
          <option value="paid">Quitado</option>
          <option value="overdue">Atrasado</option>
          <option value="cancelled">Cancelado</option>
        </Select>
      </div>

      <SimpleTable columns={columns} data={loans} emptyTitle="Nenhum empréstimo cadastrado" />

      <Modal title="Novo empréstimo" open={modalOpen} onClose={() => setModalOpen(false)}>
        <LoanForm clients={clients} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} loading={loading} />
      </Modal>
    </div>
  );
}
