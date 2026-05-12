import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import FinancialCard from '../components/cards/FinancialCard.jsx';
import PaymentModal from '../components/forms/PaymentModal.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { getLoanById } from '../services/loansService.js';
import { listInstallmentsByLoan, registerInstallmentPayment } from '../services/installmentsService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import { sumBy } from '../utils/calculations.js';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters.js';

export default function LoanDetails() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [loanData, installmentsData] = await Promise.all([getLoanById(id), listInstallmentsByLoan(id)]);
      setLoan(loanData);
      setInstallments(installmentsData);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSubmit(payload) {
    try {
      setSaving(true);
      await registerInstallmentPayment(payload);
      setPaymentOpen(false);
      setSelectedInstallment(null);
      await loadData();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const paid = installments.filter((item) => item.status === 'paid');
    const pending = installments.filter((item) => item.status === 'pending');
    const overdue = installments.filter((item) => item.status === 'overdue');
    const received = sumBy(paid, (item) => item.paid_amount || item.amount);
    const pendingValue = Math.max(Number(loan?.total_amount || 0) - received, 0);

    return { paid, pending, overdue, received, pendingValue };
  }, [installments, loan]);

  if (loading) return <p className="text-sm text-slate-500">Carregando empréstimo...</p>;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!loan) return null;

  const columns = [
    { key: 'installment_number', header: 'Parcela', render: (row) => `#${row.installment_number}` },
    { key: 'amount', header: 'Valor', render: (row) => formatCurrency(row.amount) },
    { key: 'due_date', header: 'Vencimento', render: (row) => formatDate(row.due_date) },
    { key: 'payment_date', header: 'Pagamento', render: (row) => formatDate(row.payment_date) },
    { key: 'paid_amount', header: 'Valor pago', render: (row) => row.paid_amount ? formatCurrency(row.paid_amount) : '-' },
    { key: 'status', header: 'Status', render: (row) => <Badge status={row.status} /> },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => row.status === 'paid' || row.status === 'cancelled' ? '-' : (
        <Button variant="secondary" onClick={() => { setSelectedInstallment(row); setPaymentOpen(true); }}>
          Marcar como paga
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Empréstimo de {loan.client?.name}</h1>
          <p className="text-sm text-slate-500">Resumo financeiro e controle das parcelas.</p>
        </div>
        <Badge status={loan.status} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinancialCard title="Valor emprestado" value={formatCurrency(loan.principal_amount)} />
        <FinancialCard title="Total a receber" value={formatCurrency(loan.total_amount)} />
        <FinancialCard title="Já recebido" value={formatCurrency(summary.received)} />
        <FinancialCard title="Pendente" value={formatCurrency(summary.pendingValue)} />
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-4">
        <Info label="Juros mensal" value={formatPercent(loan.monthly_interest_rate)} />
        <Info label="Parcelas pagas" value={`${summary.paid.length}/${installments.length}`} />
        <Info label="Parcelas pendentes" value={summary.pending.length} />
        <Info label="Parcelas atrasadas" value={summary.overdue.length} />
        <Info label="Data inicial" value={formatDate(loan.start_date)} />
        <Info label="Primeiro vencimento" value={formatDate(loan.first_due_date)} />
        <Info label="Valor da parcela" value={formatCurrency(loan.installment_amount)} />
        <Info label="Observações" value={loan.notes} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Parcelas</h2>
        <SimpleTable columns={columns} data={installments} emptyTitle="Nenhuma parcela encontrada" />
      </section>

      <PaymentModal
        open={paymentOpen}
        installment={selectedInstallment}
        onClose={() => setPaymentOpen(false)}
        onSubmit={handlePaymentSubmit}
        loading={saving}
      />
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
