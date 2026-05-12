export default function Textarea({ label, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <textarea
        className={`min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 ${className}`}
        {...props}
      />
    </label>
  );
}
