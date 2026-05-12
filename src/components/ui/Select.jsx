export default function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <select
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
