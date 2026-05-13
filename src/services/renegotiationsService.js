import { supabase } from './supabase.js';

export async function renegotiateLoan({
  loanId,
  newMonthlyInterestRate,
  newInstallmentsCount,
  firstDueDate,
  notes,
}) {
  if (!loanId) {
    throw new Error('Empréstimo não informado.');
  }

  if (Number(newInstallmentsCount) <= 0) {
    throw new Error('Informe uma quantidade válida de parcelas.');
  }

  if (Number(newMonthlyInterestRate) < 0) {
    throw new Error('Informe uma taxa de juros válida.');
  }

  if (!firstDueDate) {
    throw new Error('Informe a data do primeiro vencimento.');
  }

  const { data, error } = await supabase.rpc('renegotiate_loan', {
    p_loan_id: loanId,
    p_new_monthly_interest_rate: Number(newMonthlyInterestRate),
    p_new_installments_count: Number(newInstallmentsCount),
    p_first_due_date: firstDueDate,
    p_notes: notes || null,
  });

  if (error) throw error;

  return data;
}

export async function listLoanRenegotiations(loanId) {
  const { data, error } = await supabase
    .from('loan_renegotiations')
    .select('*')
    .eq('loan_id', loanId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}