export default function FinancialCard({ title, value, icon: Icon, description }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
