import { supabase } from './supabase.js';

export async function listPayments(filters = {}) {
  let query = supabase
    .from('payments')
    .select('*, client:clients(id, name), loan:loans(id), installment:installments(id, installment_number, due_date)')
    .order('payment_date', { ascending: false });

  if (filters.startDate) query = query.gte('payment_date', filters.startDate);
  if (filters.endDate) query = query.lte('payment_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function exportPaymentsToCsv(payments) {
  const header = ['Data', 'Cliente', 'Parcela', 'Valor', 'Observações'];
  const rows = payments.map((payment) => [
    payment.payment_date,
    payment.client?.name || '',
    payment.installment?.installment_number || '',
    String(payment.amount).replace('.', ','),
    payment.notes || '',
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relatorio-recebimentos.csv';
  link.click();
  URL.revokeObjectURL(url);
}
