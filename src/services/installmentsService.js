import { supabase } from './supabase.js';
import { todayISO } from '../utils/dates.js';

export async function refreshOverdueInstallments() {
  const { error } = await supabase.rpc('refresh_overdue_installments');
  if (error) throw error;
}

export async function listInstallmentsByLoan(loanId) {
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .eq('loan_id', loanId)
    .order('installment_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listOverdueInstallments(limit = 20) {
  await refreshOverdueInstallments();

  const { data, error } = await supabase
    .from('installments')
    .select('*, loan:loans(id, client:clients(id, name, phone))')
    .in('status', ['pending', 'overdue'])
    .lt('due_date', todayISO())
    .order('due_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listUpcomingInstallments(limit = 10) {
  await refreshOverdueInstallments();

  const { data, error } = await supabase
    .from('installments')
    .select('*, loan:loans(id, client:clients(id, name, phone))')
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function registerInstallmentPayment({ installmentId, paidAmount, paymentDate, notes }) {
  const { data, error } = await supabase.rpc('register_installment_payment', {
    p_installment_id: installmentId,
    p_paid_amount: Number(paidAmount),
    p_payment_date: paymentDate,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data;
}

export async function updateInstallment(id, payload) {
  const { data, error } = await supabase
    .from('installments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
