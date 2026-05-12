export default function EmptyState({ title = 'Nenhum registro encontrado', description = 'Cadastre um novo item para começar.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
