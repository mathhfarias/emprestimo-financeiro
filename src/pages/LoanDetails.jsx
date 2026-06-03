import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Repeat2 } from 'lucide-react';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import FinancialCard from '../components/cards/FinancialCard.jsx';
import PaymentModal from '../components/forms/PaymentModal.jsx';
import RenegotiationModal from '../components/forms/RenegotiationModal.jsx';
import PermissionGate from '../components/ui/PermissionGate.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import AuditTrail from '../components/cards/AuditTrail.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getLoanById } from '../services/loansService.js';
import {
  listInstallmentsByLoan,
  registerInstallmentPayment,
} from '../services/installmentsService.js';
import { renegotiateLoan } from '../services/renegotiationsService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import {
  calculateLateInstallment,
  sumBy,
} from '../utils/calculations.js';
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from '../utils/formatters.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { generateLoanContractPdf } from '../utils/contractPdf.js';

export default function LoanDetails() {
  const { id } = useParams();
  const { hasPermission } = useAuth();

  const [loan, setLoan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [renegotiationOpen, setRenegotiationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [renegotiating, setRenegotiating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [loanData, installmentsData] = await Promise.all([
        getLoanById(id),
        listInstallmentsByLoan(id),
      ]);

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
      if (!hasPermission(PERMISSIONS.PAYMENT_CREATE)) {
        setError('Você não tem permissão para registrar pagamentos.');
        return;
      }

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

  async function handleRenegotiationSubmit(payload) {
    try {
      if (!hasPermission(PERMISSIONS.LOAN_RENEGOTIATE)) {
        setError('Você não tem permissão para renegociar empréstimos.');
        return;
      }

      setRenegotiating(true);
      setError('');

      await renegotiateLoan({
        loanId: loan.id,
        newMonthlyInterestRate: payload.newMonthlyInterestRate,
        newInstallmentsCount: payload.newInstallmentsCount,
        firstDueDate: payload.firstDueDate,
        notes: payload.notes,
      });

      setRenegotiationOpen(false);
      await loadData();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setRenegotiating(false);
    }
  }

  function handleGenerateContract() {
    try {
      if (!hasPermission(PERMISSIONS.LOAN_CONTRACT_GENERATE)) {
        setError('Você não tem permissão para gerar contrato.');
        return;
      }

      generateLoanContractPdf({
        loan,
        installments: enrichedInstallments,
      });
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    }
  }

  function openPaymentModal(installment) {
    setSelectedInstallment(installment);
    setPaymentOpen(true);
  }

  const enrichedInstallments = useMemo(() => {
    return installments.map((installment) => {
      const lateCalculation = calculateLateInstallment({
        amount: installment.amount,
        dueDate: installment.due_date,
        status: installment.status,
        lateFeeRate: loan?.late_fee_rate,
        dailyLateInterestRate: loan?.daily_late_interest_rate,
      });

      return {
        ...installment,
        ...lateCalculation,
      };
    });
  }, [installments, loan]);

  const summary = useMemo(() => {
    const paid = enrichedInstallments.filter((item) => item.status === 'paid');

    const pending = enrichedInstallments.filter(
      (item) => item.status === 'pending'
    );

    const overdue = enrichedInstallments.filter(
      (item) => item.status === 'overdue' || item.daysLate > 0
    );

    const openInstallments = enrichedInstallments.filter(
      (item) => !['paid', 'cancelled'].includes(item.status)
    );

    const received = sumBy(paid, (item) => item.paid_amount || item.amount);

    const pendingValue = Math.max(
      Number(loan?.total_amount || 0) - received,
      0
    );

    const updatedOpenValue = sumBy(
      openInstallments,
      (item) => item.updatedAmount
    );

    return {
      paid,
      pending,
      overdue,
      openInstallments,
      received,
      pendingValue,
      updatedOpenValue,
    };
  }, [enrichedInstallments, loan]);

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando empréstimo...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!loan) return null;

  const canRenegotiate =
    !['paid', 'cancelled'].includes(loan.status) &&
    summary.openInstallments.length > 0 &&
    summary.updatedOpenValue > 0;

  const columns = [
    {
      key: 'installment_number',
      header: 'Parcela',
      render: (row) => `#${row.installment_number}`,
    },
    {
      key: 'amount',
      header: 'Valor original',
      render: (row) => formatCurrency(row.amount),
    },
    {
      key: 'due_date',
      header: 'Vencimento',
      render: (row) => formatDate(row.due_date),
    },
    {
      key: 'daysLate',
      header: 'Dias atraso',
      render: (row) => (row.daysLate > 0 ? row.daysLate : '-'),
    },
    {
      key: 'updatedAmount',
      header: 'Valor atualizado',
      render: (row) => formatCurrency(row.updatedAmount),
    },
    {
      key: 'payment_date',
      header: 'Pagamento',
      render: (row) => formatDate(row.payment_date),
    },
    {
      key: 'paid_amount',
      header: 'Valor pago',
      render: (row) =>
        row.paid_amount ? formatCurrency(row.paid_amount) : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => {
        if (row.status === 'paid' || row.status === 'cancelled') {
          return '-';
        }

        return (
          <PermissionGate permission={PERMISSIONS.PAYMENT_CREATE} fallback="-">
            <Button variant="secondary" onClick={() => openPaymentModal(row)}>
              Marcar como paga
            </Button>
          </PermissionGate>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Empréstimo de {loan.client?.name}
          </h1>

          <p className="text-sm text-slate-500">
            Resumo financeiro, regras de atraso e controle das parcelas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge status={loan.status} />

          <PermissionGate permission={PERMISSIONS.LOAN_CONTRACT_GENERATE}>
            <button
              type="button"
              onClick={handleGenerateContract}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-inset ring-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
            >
              <FileText size={16} />
              Gerar contrato
            </button>
          </PermissionGate>

          <PermissionGate permission={PERMISSIONS.LOAN_RENEGOTIATE}>
            <button
              type="button"
              onClick={() => setRenegotiationOpen(true)}
              disabled={!canRenegotiate}
              title={
                canRenegotiate
                  ? 'Renegociar parcelas em aberto'
                  : 'Este empréstimo não possui saldo em aberto para renegociar'
              }
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                canRenegotiate
                  ? 'bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200'
              }`}
            >
              <Repeat2 size={16} />
              {canRenegotiate ? 'Renegociar' : 'Sem saldo para renegociar'}
            </button>
          </PermissionGate>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FinancialCard
          title="Valor emprestado"
          value={formatCurrency(loan.principal_amount)}
        />

        <FinancialCard
          title="Total a receber"
          value={formatCurrency(loan.total_amount)}
        />

        <FinancialCard
          title="Já recebido"
          value={formatCurrency(summary.received)}
        />

        <FinancialCard
          title="Pendente original"
          value={formatCurrency(summary.pendingValue)}
        />

        <FinancialCard
          title="Em aberto atualizado"
          value={formatCurrency(summary.updatedOpenValue)}
        />
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-4">
        <Info
          label="Juros mensal"
          value={formatPercent(loan.monthly_interest_rate)}
        />

        <Info
          label="Multa por atraso"
          value={formatPercent(loan.late_fee_rate)}
        />

        <Info
          label="Juros diário por atraso"
          value={formatPercent(loan.daily_late_interest_rate)}
        />

        <Info
          label="Parcelas pagas"
          value={`${summary.paid.length}/${installments.length}`}
        />

        <Info label="Parcelas pendentes" value={summary.pending.length} />

        <Info label="Parcelas atrasadas" value={summary.overdue.length} />

        <Info label="Data inicial" value={formatDate(loan.start_date)} />

        <Info
          label="Primeiro vencimento"
          value={formatDate(loan.first_due_date)}
        />

        <Info
          label="Valor da parcela"
          value={formatCurrency(loan.installment_amount)}
        />

        <Info label="Observações" value={loan.notes} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Parcelas</h2>

        <SimpleTable
          columns={columns}
          data={enrichedInstallments}
          emptyTitle="Nenhuma parcela encontrada"
        />
      </section>

      <AuditTrail
        entity="loans"
        entityId={loan.id}
        title="Histórico do empréstimo"
        description="Veja alterações, parcelas, pagamentos e renegociações relacionados a este empréstimo."
      />

      <PaymentModal
        open={paymentOpen}
        installment={selectedInstallment}
        onClose={() => setPaymentOpen(false)}
        onSubmit={handlePaymentSubmit}
        loading={saving}
      />

      <RenegotiationModal
        open={renegotiationOpen}
        currentAmount={summary.updatedOpenValue}
        loan={loan}
        onClose={() => setRenegotiationOpen(false)}
        onSubmit={handleRenegotiationSubmit}
        loading={renegotiating}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value || '-'}
      </p>
    </div>
  );
}