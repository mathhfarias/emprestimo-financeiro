import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import { calculateSimpleInterestLoan } from '../../utils/calculations.js';
import { todayISO } from '../../utils/dates.js';
import { formatCurrency } from '../../utils/formatters.js';

const initialState = {
  newMonthlyInterestRate: '',
  newInstallmentsCount: '',
  firstDueDate: todayISO(),
  notes: '',
};

export default function RenegotiationModal({
  open,
  currentAmount,
  loan,
  onClose,
  onSubmit,
  loading,
}) {
  const [form, setForm] = useState(initialState);
  const safeCurrentAmount = Number(currentAmount || 0);

  useEffect(() => {
    if (open) {
      setForm({
        newMonthlyInterestRate: String(loan?.monthly_interest_rate || ''),
        newInstallmentsCount: '',
        firstDueDate: todayISO(),
        notes: '',
      });
    }
  }, [open, loan]);

  const preview = useMemo(() => {
    try {
      if (
        safeCurrentAmount <= 0 ||
        !form.newInstallmentsCount ||
        Number(form.newInstallmentsCount) <= 0
      ) {
        return null;
      }

      return calculateSimpleInterestLoan({
        principalAmount: safeCurrentAmount,
        monthlyInterestRate: form.newMonthlyInterestRate || 0,
        installmentsCount: Number(form.newInstallmentsCount),
      });
    } catch {
      return null;
    }
  }, [
    safeCurrentAmount,
    form.newMonthlyInterestRate,
    form.newInstallmentsCount,
  ]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit({
      newMonthlyInterestRate: form.newMonthlyInterestRate,
      newInstallmentsCount: form.newInstallmentsCount,
      firstDueDate: form.firstDueDate,
      notes: form.notes,
    });
  }

  return (
    <Modal
      title="Renegociar empréstimo"
      open={open}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">Atenção</p>
          <p className="mt-1">
            As parcelas pendentes e atrasadas atuais serão canceladas. O sistema
            criará um novo plano de parcelas com base no saldo atualizado.
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
          <PreviewItem
            label="Saldo atualizado para renegociação"
            value={formatCurrency(safeCurrentAmount)}
          />

          <PreviewItem
            label="Multa/Juros atuais"
            value={`${Number(loan?.late_fee_rate || 0).toLocaleString(
              'pt-BR'
            )}% multa / ${Number(
              loan?.daily_late_interest_rate || 0
            ).toLocaleString('pt-BR')}% ao dia`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nova taxa de juros mensal (%)"
            type="number"
            step="0.01"
            min="0"
            name="newMonthlyInterestRate"
            value={form.newMonthlyInterestRate}
            onChange={handleChange}
            required
          />

          <Input
            label="Nova quantidade de parcelas"
            type="number"
            min="1"
            name="newInstallmentsCount"
            value={form.newInstallmentsCount}
            onChange={handleChange}
            required
          />

          <Input
            label="Primeiro vencimento"
            type="date"
            name="firstDueDate"
            value={form.firstDueDate}
            onChange={handleChange}
            required
          />
        </div>

        {preview && (
          <div className="grid gap-4 rounded-2xl bg-emerald-50 p-4 md:grid-cols-2">
            <PreviewItem
              label="Novo total a receber"
              value={formatCurrency(preview.totalAmount)}
            />

            <PreviewItem
              label="Nova parcela"
              value={formatCurrency(preview.installmentAmount)}
            />
          </div>
        )}

        <Textarea
          label="Observações da renegociação"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Ex.: Cliente renegociou saldo em atraso para novo plano de pagamento."
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>

          <Button type="submit" disabled={loading || safeCurrentAmount <= 0}>
            {loading ? 'Renegociando...' : 'Confirmar renegociação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}