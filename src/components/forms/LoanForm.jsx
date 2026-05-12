import { useMemo, useState } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import { calculateSimpleInterestLoan } from '../../utils/calculations.js';
import { formatCurrency } from '../../utils/formatters.js';
import { todayISO } from '../../utils/dates.js';

const initialState = {
  client_id: '',
  principal_amount: '',
  monthly_interest_rate: '',
  installments_count: '',
  start_date: todayISO(),
  first_due_date: todayISO(),
  status: 'active',
  notes: '',
};

export default function LoanForm({ clients, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initialState);

  const preview = useMemo(() => {
    try {
      if (!form.principal_amount || !form.installments_count) return null;
      return calculateSimpleInterestLoan({
        principalAmount: form.principal_amount,
        monthlyInterestRate: form.monthly_interest_rate || 0,
        installmentsCount: Number(form.installments_count),
      });
    } catch {
      return null;
    }
  }, [form.principal_amount, form.monthly_interest_rate, form.installments_count]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Select label="Cliente vinculado" name="client_id" value={form.client_id} onChange={handleChange} required>
        <option value="">Selecione um cliente</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </Select>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Valor emprestado" type="number" step="0.01" min="0" name="principal_amount" value={form.principal_amount} onChange={handleChange} required />
        <Input label="Taxa de juros mensal (%)" type="number" step="0.01" min="0" name="monthly_interest_rate" value={form.monthly_interest_rate} onChange={handleChange} required />
        <Input label="Quantidade de parcelas" type="number" min="1" name="installments_count" value={form.installments_count} onChange={handleChange} required />
        <Select label="Tipo de cálculo" disabled value="simple">
          <option value="simple">Juros simples</option>
        </Select>
        <Input label="Data inicial" type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
        <Input label="Primeiro vencimento" type="date" name="first_due_date" value={form.first_due_date} onChange={handleChange} required />
      </div>

      {preview && (
        <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Valor total a receber</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(preview.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Valor da parcela</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(preview.installmentAmount)}</p>
          </div>
        </div>
      )}

      <Textarea label="Observações" name="notes" value={form.notes} onChange={handleChange} />

      <div className="flex justify-end gap-3">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Cadastrar empréstimo'}</Button>
      </div>
    </form>
  );
}
