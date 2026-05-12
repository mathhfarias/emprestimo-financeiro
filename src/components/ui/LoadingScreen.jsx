export default function LoadingScreen({ text = 'Carregando...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm">
        {text}
      </div>
    </div>
  );
}
