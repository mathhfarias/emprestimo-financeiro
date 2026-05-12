import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Select from '../components/ui/Select.jsx';
import FinancialCard from '../components/cards/FinancialCard.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { exportPaymentsToCsv, listPayments } from '../services/paymentsService.js';
import { listOverdueInstallments } from '../services/installmentsService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import { getMonthRange } from '../utils/dates.js';
import { sumBy } from '../utils/calculations.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

const currentDate = new Date();

export default function Financial() {
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [payments, setPayments] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [month, year]);

  async function loadReport() {
    try {
      setError('');
      const range = getMonthRange(year, month);
      const [paymentsData, overdueData] = await Promise.all([
        listPayments({ startDate: range.start, endDate: range.end }),
        listOverdueInstallments(100),
      ]);
      setPayments(paymentsData);
      setOverdue(overdueData);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    }
  }

  const totals = useMemo(() => ({
    received: sumBy(payments, (payment) => payment.amount),
    overdue: sumBy(overdue, (installment) => installment.amount),
  }), [payments, overdue]);

  const paymentColumns = [
    { key: 'payment_date', header: 'Data', render: (row) => formatDate(row.payment_date) },
    { key: 'client', header: 'Cliente', render: (row) => row.client?.name || '-' },
    { key: 'installment', header: 'Parcela', render: (row) => row.installment?.installment_number ? `#${row.installment.installment_number}` : '-' },
    { key: 'amount', header: 'Valor', render: (row) => formatCurrency(row.amount) },
    { key: 'notes', header: 'Observações' },
  ];

  const overdueColumns = [
    { key: 'client', header: 'Cliente', render: (row) => row.loan?.client?.name || '-' },
    { key: 'installment_number', header: 'Parcela', render: (row) => `#${row.installment_number}` },
    { key: 'due_date', header: 'Vencimento', render: (row) => formatDate(row.due_date) },
    { key: 'amount', header: 'Valor em atraso', render: (row) => formatCurrency(row.amount) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Financeiro</h1>
          <p className="text-sm text-slate-500">Relatórios de recebimentos, valores em aberto e atrasados.</p>
        </div>
        <Button variant="secondary" onClick={() => exportPaymentsToCsv(payments)}>
          <Download size={16} /> Exportar CSV
        </Button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2">
        <Select label="Mês" value={month} onChange={(event) => setMonth(event.target.value)}>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={String(index + 1)}>{String(index + 1).padStart(2, '0')}</option>
          ))}
        </Select>
        <Select label="Ano" value={year} onChange={(event) => setYear(event.target.value)}>
          {Array.from({ length: 6 }, (_, index) => {
            const optionYear = currentDate.getFullYear() - 3 + index;
            return <option key={optionYear} value={String(optionYear)}>{optionYear}</option>;
          })}
        </Select>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <FinancialCard title="Recebido no período" value={formatCurrency(totals.received)} />
        <FinancialCard title="Total em atraso" value={formatCurrency(totals.overdue)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Recebimentos</h2>
        <SimpleTable columns={paymentColumns} data={payments} emptyTitle="Nenhum recebimento no período" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Parcelas atrasadas</h2>
        <SimpleTable columns={overdueColumns} data={overdue} emptyTitle="Nenhuma parcela atrasada" />
      </section>
    </div>
  );
}
