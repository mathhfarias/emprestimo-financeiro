import { useEffect, useState } from 'react';
import {
  Clock3,
  FileClock,
  PlusCircle,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react';
import Button from '../ui/Button.jsx';
import { listAuditLogsByEntity } from '../../services/auditLogsService.js';
import { getFriendlySupabaseError } from '../../services/supabase.js';

const ACTION_CONFIG = {
  create: {
    label: 'Criação',
    icon: PlusCircle,
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  update: {
    label: 'Atualização',
    icon: RefreshCw,
    className: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  delete: {
    label: 'Exclusão',
    icon: Trash2,
    className: 'bg-red-50 text-red-700 ring-red-100',
  },
};

export default function AuditTrail({
  entity,
  entityId,
  title = 'Histórico de auditoria',
  description = 'Acompanhe as principais ações realizadas nesta entidade.',
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLogs();
  }, [entity, entityId]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError('');

      const data = await listAuditLogsByEntity(entity, entityId);
      setLogs(data);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <FileClock size={22} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <Button variant="secondary" onClick={loadLogs}>
          <RefreshCw size={16} />
          Atualizar
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando histórico...</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <Clock3 className="mx-auto text-slate-300" size={28} />
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Nenhum registro encontrado
          </p>
          <p className="mt-1 text-xs text-slate-400">
            As próximas ações realizadas nesta entidade aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <AuditItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </section>
  );
}

function AuditItem({ log }) {
  const config = ACTION_CONFIG[log.action] || {
    label: log.action || 'Ação',
    icon: FileClock,
    className: 'bg-slate-50 text-slate-700 ring-slate-100',
  };

  const Icon = config.icon;

  return (
    <article className="flex gap-3 rounded-2xl border border-slate-100 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${config.className}`}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-slate-900">
            {log.description || 'Ação registrada'}
          </p>

          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {config.label}
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-4">
          <span className="inline-flex items-center gap-1">
            <User size={13} />
            {log.actor_name || 'Sistema'}
          </span>

          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {formatAuditDate(log.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}

function formatAuditDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}