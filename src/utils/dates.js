export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsISO(dateISO, monthsToAdd) {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, day);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isPastDate(dateISO) {
  if (!dateISO) return false;
  return dateISO < todayISO();
}

export function getMonthRange(year, month) {
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0);
  const toISO = (date) => date.toISOString().slice(0, 10);
  return { start: toISO(start), end: toISO(end) };
}
