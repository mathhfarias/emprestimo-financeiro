import { addMonthsISO, todayISO } from './dates.js';

export function calculateSimpleInterestLoan({
  principalAmount,
  monthlyInterestRate,
  installmentsCount,
}) {
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

export function buildInstallments({
  loanId,
  userId,
  firstDueDate,
  installmentsCount,
  installmentAmount,
}) {
  return Array.from({ length: Number(installmentsCount) }, (_, index) => ({
    user_id: userId,
    loan_id: loanId,
    installment_number: index + 1,
    amount: installmentAmount,
    due_date: addMonthsISO(firstDueDate, index),
    status: 'pending',
  }));
}

export function calculateDaysLate(dueDate, referenceDate = todayISO()) {
  if (!dueDate) return 0;

  const due = parseISODateLocal(dueDate);
  const reference = parseISODateLocal(referenceDate);

  if (!due || !reference) return 0;

  due.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);

  const diffMs = reference.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  return Math.max(diffDays, 0);
}

export function calculateLateInstallment({
  amount,
  dueDate,
  status,
  lateFeeRate = 0,
  dailyLateInterestRate = 0,
  referenceDate = todayISO(),
}) {
  const baseAmount = Number(amount || 0);
  const isClosed = ['paid', 'cancelled'].includes(status);
  const daysLate = isClosed ? 0 : calculateDaysLate(dueDate, referenceDate);

  if (daysLate <= 0 || baseAmount <= 0) {
    return {
      daysLate: 0,
      lateFeeAmount: 0,
      dailyInterestAmount: 0,
      updatedAmount: roundMoney(baseAmount),
      hasLateCharges: false,
    };
  }

  const lateFeePercent = Number(lateFeeRate || 0) / 100;
  const dailyInterestPercent = Number(dailyLateInterestRate || 0) / 100;

  const lateFeeAmount = roundMoney(baseAmount * lateFeePercent);
  const dailyInterestAmount = roundMoney(
    baseAmount * dailyInterestPercent * daysLate
  );

  const updatedAmount = roundMoney(
    baseAmount + lateFeeAmount + dailyInterestAmount
  );

  return {
    daysLate,
    lateFeeAmount,
    dailyInterestAmount,
    updatedAmount,
    hasLateCharges: lateFeeAmount > 0 || dailyInterestAmount > 0,
  };
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function parseISODateLocal(dateISO) {
  if (!dateISO) return null;

  const [year, month, day] = String(dateISO).split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}