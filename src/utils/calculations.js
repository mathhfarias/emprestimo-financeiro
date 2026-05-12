import { addMonthsISO } from './dates.js';

export function calculateSimpleInterestLoan({ principalAmount, monthlyInterestRate, installmentsCount }) {
  const principal = Number(principalAmount);
  const rate = Number(monthlyInterestRate) / 100;
  const count = Number(installmentsCount);

  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error('Informe um valor emprestado válido.');
  }

  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('Informe uma taxa de juros válida.');
  }

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Informe uma quantidade de parcelas válida.');
  }

  const totalAmount = principal + principal * rate * count;
  const installmentAmount = totalAmount / count;

  return {
    totalAmount: roundMoney(totalAmount),
    installmentAmount: roundMoney(installmentAmount),
  };
}

export function buildInstallments({ loanId, userId, firstDueDate, installmentsCount, installmentAmount }) {
  return Array.from({ length: Number(installmentsCount) }, (_, index) => ({
    user_id: userId,
    loan_id: loanId,
    installment_number: index + 1,
    amount: installmentAmount,
    due_date: addMonthsISO(firstDueDate, index),
    status: 'pending',
  }));
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}
