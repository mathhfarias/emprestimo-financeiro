import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import { todayISO } from '../../utils/dates.js';
import { formatCurrency } from '../../utils/formatters.js';

export default function PaymentModal({
  open,
  installment,
  onClose,
  onSubmit,
  loading,
}) {
  const [form, setForm] = useState({
    paidAmount: '',
    paymentDate: todayISO(),
    notes: '',
  });

  useEffect(() => {
    if (installment) {
      setForm({
        paidAmount: installment.updatedAmount || installment.amount || '',
        paymentDate: todayISO(),
        notes: '',
      });
    }
  }, [installment]);

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
      ...form,
      installmentId: installment.id,
    });
  }

  if (!installment) return null;

  return (
    <Modal
      title={`Registrar pagamento - Parcela ${installment.installment_number}`}
      open={open}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {installment.hasLateCharges && (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">Parcela em atraso</p>

            <div className="mt-2 space-y-1 text-xs">
              <p>Dias em atraso: {installment.daysLate}</p>
              <p>Valor original: {formatCurrency(installment.amount)}</p>
              <p>Multa: {formatCurrency(installment.lateFeeAmount)}</p>
              <p>
                Juros acumulados:{' '}
                {formatCurrency(installment.dailyInterestAmount)}
              </p>
              <p className="font-bold">
                Valor atualizado: {formatCurrency(installment.updatedAmount)}
              </p>
            </div>
          </div>
        )}

        <Input
          label="Valor pago"
          type="number"
          step="0.01"
          min="0"
          name="paidAmount"
          value={form.paidAmount}
          onChange={handleChange}
          required
        />

        <Input
          label="Data de pagamento"
          type="date"
          name="paymentDate"
          value={form.paymentDate}
          onChange={handleChange}
          required
        />

        <Textarea
          label="Observações"
          name="notes"
          value={form.notes}
          onChange={handleChange}
        />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>

          <Button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Confirmar pagamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}