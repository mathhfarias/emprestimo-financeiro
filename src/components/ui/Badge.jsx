import { statusLabel } from '../../utils/formatters.js';

const styles = {
  active: 'bg-blue-50 text-blue-700 border-blue-200',
  inactive: 'bg-slate-50 text-slate-700 border-slate-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

export default function Badge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.inactive}`}>
      {statusLabel(status)}
    </span>
  );
}
