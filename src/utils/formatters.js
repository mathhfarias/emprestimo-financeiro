export const currencyBR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value = 0) {
  return currencyBR.format(Number(value || 0));
}

export function formatPercent(value = 0) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function formatDate(date) {
  if (!date) return '-';
  const [year, month, day] = String(date).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function statusLabel(status) {
  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    paid: 'Quitado',
    overdue: 'Atrasado',
    cancelled: 'Cancelado',
    pending: 'Pendente',
  };
  return labels[status] || status || '-';
}
