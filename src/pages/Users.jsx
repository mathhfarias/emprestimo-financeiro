import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldAlert, UserCog } from 'lucide-react';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import Select from '../components/ui/Select.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  listUserProfiles,
  updateUserProfile,
} from '../services/usersService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import {
  ROLES,
  ROLE_LABELS,
  getRoleLabel,
} from '../utils/permissions.js';
import { formatDate } from '../utils/formatters.js';

export default function Users() {
  const { user, isAdmin, reloadProfile } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    role: ROLES.VIEWER,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const totalByRole = useMemo(() => {
    return profiles.reduce(
      (acc, profile) => {
        acc[profile.role] = (acc[profile.role] || 0) + 1;
        return acc;
      },
      {
        [ROLES.ADMIN]: 0,
        [ROLES.OPERATOR]: 0,
        [ROLES.VIEWER]: 0,
      }
    );
  }, [profiles]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');
      const data = await listUserProfiles();
      setProfiles(data);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(profile) {
    setEditingProfile(profile);
    setForm({
      name: profile.name || '',
      role: profile.role || ROLES.VIEWER,
    });
    setError('');
    setSuccess('');
  }

  function closeModal() {
    setEditingProfile(null);
    setForm({
      name: '',
      role: ROLES.VIEWER,
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editingProfile) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const isEditingOwnUser = editingProfile.id === user?.id;

      const payload = {
        name: form.name,
        role: isEditingOwnUser ? editingProfile.role : form.role,
      };

      await updateUserProfile(editingProfile.id, payload);

      if (isEditingOwnUser) {
        await reloadProfile();
      }

      setSuccess('Usuário atualizado com sucesso.');
      closeModal();
      await loadUsers();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-amber-800">
        <div className="flex items-start gap-3">
          <ShieldAlert size={24} />
          <div>
            <h1 className="text-lg font-bold">Acesso restrito</h1>
            <p className="mt-1 text-sm">
              Apenas administradores podem acessar a tela de usuários.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {row.name || 'Sem nome'}
          </p>
          {row.id === user?.id && (
            <p className="text-xs font-medium text-slate-400">
              Seu usuário
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'E-mail',
      render: (row) => row.email || '-',
    },
    {
      key: 'role',
      header: 'Função',
      render: (row) => (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {getRoleLabel(row.role)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (row) => formatDate(row.created_at?.slice(0, 10)),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <Button variant="secondary" onClick={() => openEditModal(row)}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Usuários
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie nome e papel dos usuários cadastrados no Supabase Auth.
          </p>
        </div>

        <Button variant="secondary" onClick={loadUsers}>
          <RefreshCw size={16} />
          Atualizar
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <RoleCard
          title="Administradores"
          value={totalByRole[ROLES.ADMIN]}
          description="Acesso total ao sistema"
        />
        <RoleCard
          title="Operadores"
          value={totalByRole[ROLES.OPERATOR]}
          description="Cadastro e operação diária"
        />
        <RoleCard
          title="Somente leitura"
          value={totalByRole[ROLES.VIEWER]}
          description="Visualização sem alteração"
        />
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <UserCog size={22} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Como criar um novo usuário?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Por segurança, a criação da conta ainda deve ser feita em
              Supabase → Authentication → Users → Add user. Depois disso, o
              usuário aparece nesta tela para você definir o nome e a função.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando usuários...</p>
      ) : (
        <SimpleTable
          columns={columns}
          data={profiles}
          emptyTitle="Nenhum usuário encontrado"
          emptyDescription="Crie usuários no Supabase Auth para gerenciá-los aqui."
        />
      )}

      <Modal
        title="Editar usuário"
        open={Boolean(editingProfile)}
        onClose={closeModal}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nome"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome do usuário"
          />

          <Input
            label="E-mail"
            value={editingProfile?.email || ''}
            disabled
          />

          <Select
            label="Função"
            name="role"
            value={form.role}
            onChange={handleChange}
            disabled={editingProfile?.id === user?.id}
          >
            <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</option>
            <option value={ROLES.OPERATOR}>{ROLE_LABELS[ROLES.OPERATOR]}</option>
            <option value={ROLES.VIEWER}>{ROLE_LABELS[ROLES.VIEWER]}</option>
          </Select>

          {editingProfile?.id === user?.id && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
              Para evitar perda de acesso, você não pode alterar a própria
              função por esta tela. Altere somente o nome.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RoleCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}