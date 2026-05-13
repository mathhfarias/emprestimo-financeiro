import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import ClientForm from '../components/forms/ClientForm.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import PermissionGate from '../components/ui/PermissionGate.jsx';
import SimpleTable from '../components/tables/SimpleTable.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  createClient,
  listClients,
  updateClient,
} from '../services/clientsService.js';
import { getFriendlySupabaseError } from '../services/supabase.js';
import { PERMISSIONS } from '../utils/permissions.js';

export default function Clients() {
  const { hasPermission } = useAuth();

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients(term = search) {
    try {
      setError('');
      setClients(await listClients(term));
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    }
  }

  async function handleSubmit(payload) {
    try {
      const permission = editingClient
        ? PERMISSIONS.CLIENT_UPDATE
        : PERMISSIONS.CLIENT_CREATE;

      if (!hasPermission(permission)) {
        setError('Você não tem permissão para salvar clientes.');
        return;
      }

      setLoading(true);

      if (editingClient) {
        await updateClient(editingClient.id, payload);
      } else {
        await createClient(payload);
      }

      setModalOpen(false);
      setEditingClient(null);
      await loadClients();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingClient(null);
    setModalOpen(true);
  }

  function openEditModal(client) {
    setEditingClient(client);
    setModalOpen(true);
  }

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (row) => (
        <Link
          className="font-semibold text-slate-900 hover:underline"
          to={`/clientes/${row.id}`}
        >
          {row.name}
        </Link>
      ),
    },
    { key: 'document', header: 'CPF/CNPJ' },
    { key: 'phone', header: 'Telefone' },
    { key: 'city', header: 'Cidade' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <PermissionGate permission={PERMISSIONS.CLIENT_UPDATE} fallback="-">
          <Button variant="secondary" onClick={() => openEditModal(row)}>
            Editar
          </Button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">
            Cadastre, pesquise e acompanhe clientes.
          </p>
        </div>

        <PermissionGate permission={PERMISSIONS.CLIENT_CREATE}>
          <Button onClick={openCreateModal}>
            <Plus size={16} /> Novo cliente
          </Button>
        </PermissionGate>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        className="flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          loadClients(search);
        }}
      >
        <Input
          placeholder="Pesquisar por nome, CPF/CNPJ ou telefone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Button type="submit">
          <Search size={16} /> Buscar
        </Button>
      </form>

      <SimpleTable
        columns={columns}
        data={clients}
        emptyTitle="Nenhum cliente cadastrado"
      />

      <Modal
        title={editingClient ? 'Editar cliente' : 'Novo cliente'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <ClientForm
          initialData={editingClient}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          loading={loading}
        />
      </Modal>
    </div>
  );
}