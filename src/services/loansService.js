import { supabase, requireCurrentUser } from './supabase.js';
import { buildInstallments, calculateSimpleInterestLoan } from '../utils/calculations.js';

export async function listLoans(filters = {}) {
  await requireCurrentUser();
  let query = supabase
    .from('loans')
    .select('*, client:clients(id, name, document, phone)')
    .order('created_at', { ascending: false });

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.startDate) query = query.gte('start_date', filters.startDate);
  if (filters.endDate) query = query.lte('start_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getLoanById(id) {
  const { data, error } = await supabase
    .from('loans')
    .select('*, client:clients(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function listLoansByClient(clientId) {
  const { data, error } = await supabase
    .from('loans')
    .select('*, installments(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createLoanWithInstallments(payload) {
  const user = await requireCurrentUser();
  validateLoan(payload);

  const calculation = calculateSimpleInterestLoan({
    principalAmount: payload.principal_amount,
    monthlyInterestRate: payload.monthly_interest_rate,
    installmentsCount: payload.installments_count,
  });

  const loanPayload = {
    user_id: user.id,
    client_id: payload.client_id,
    principal_amount: Number(payload.principal_amount),
    monthly_interest_rate: Number(payload.monthly_interest_rate),
    installments_count: Number(payload.installments_count),
    installment_amount: calculation.installmentAmount,
    total_amount: calculation.totalAmount,
    start_date: payload.start_date,
    first_due_date: payload.first_due_date,
    status: payload.status || 'active',
    notes: payload.notes?.trim() || null,
  };

  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert(loanPayload)
    .select()
    .single();

  if (loanError) throw loanError;

  const installments = buildInstallments({
    loanId: loan.id,
    userId: user.id,
    firstDueDate: loan.first_due_date,
    installmentsCount: loan.installments_count,
    installmentAmount: loan.installment_amount,
  });

  const { error: installmentError } = await supabase.from('installments').insert(installments);

  if (installmentError) {
    await supabase.from('loans').delete().eq('id', loan.id);
    throw installmentError;
  }

  return loan;
}

export async function updateLoanStatus(id, status) {
  const { data, error } = await supabase
    .from('loans')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function validateLoan(payload) {
  if (!payload.client_id) throw new Error('Selecione um cliente.');
  if (Number(payload.principal_amount) <= 0) throw new Error('Informe o valor emprestado.');
  if (Number(payload.monthly_interest_rate) < 0) throw new Error('Informe a taxa de juros.');
  if (Number(payload.installments_count) <= 0) throw new Error('Informe a quantidade de parcelas.');
  if (!payload.start_date) throw new Error('Informe a data inicial.');
  if (!payload.first_due_date) throw new Error('Informe a data do primeiro vencimento.');
}
