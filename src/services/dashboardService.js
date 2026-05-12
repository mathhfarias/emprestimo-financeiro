import { supabase } from './supabase.js';
import { refreshOverdueInstallments, listUpcomingInstallments } from './installmentsService.js';
import { sumBy } from '../utils/calculations.js';

export async function getDashboardData() {
  await refreshOverdueInstallments();

  const [clientsRes, loansRes, installmentsRes, paymentsRes, upcoming] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('loans').select('*').neq('status', 'cancelled'),
    supabase.from('installments').select('*'),
    supabase.from('payments').select('*'),
    listUpcomingInstallments(8),
  ]);

  const responses = [clientsRes, loansRes, installmentsRes, paymentsRes];
  const error = responses.find((res) => res.error)?.error;
  if (error) throw error;

  const clients = clientsRes.data || [];
  const loans = loansRes.data || [];
  const installments = installmentsRes.data || [];
  const payments = paymentsRes.data || [];

  const totalBorrowed = sumBy(loans, (loan) => loan.principal_amount);
  const totalExpected = sumBy(loans, (loan) => loan.total_amount);
  const totalReceived = sumBy(payments, (payment) => payment.amount);
  const totalOpen = totalExpected - totalReceived;
  const overdueInstallments = installments.filter((item) => item.status === 'overdue');

  return {
    metrics: {
      totalBorrowed,
      totalReceived,
      totalOpen,
      clientsCount: clients.length,
      activeLoansCount: loans.filter((loan) => ['active', 'overdue'].includes(loan.status)).length,
      overdueInstallmentsCount: overdueInstallments.length,
    },
    upcomingInstallments: upcoming,
  };
}
