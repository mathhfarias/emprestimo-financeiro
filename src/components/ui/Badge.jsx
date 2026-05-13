const STATUS_CONFIG = {
  active: {
    label: 'Ativo',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  paid: {
    label: 'Quitado',
    className: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
  },
  pending: {
    label: 'Pendente',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  overdue: {
    label: 'Atrasado',
    className: 'bg-red-50 text-red-700 ring-red-200',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
  inactive: {
    label: 'Inativo',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
  viewer: {
    label: 'Somente leitura',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
  },
  operator: {
    label: 'Operador',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    dot: 'bg-indigo-500',
  },
  admin: {
    label: 'Administrador',
    className: 'bg-violet-50 text-violet-700 ring-violet-200',
    dot: 'bg-violet-500',
  },
};

export default function Badge({ status, label }) {
  const config = STATUS_CONFIG[status] || {
    label: label || status || 'Status',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label || config.label}
    </span>
  );
}