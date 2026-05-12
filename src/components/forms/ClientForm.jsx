import { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';

const initialState = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  status: 'active',
};

export default function ClientForm({ initialData, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    setForm(initialData ? { ...initialState, ...initialData } : initialState);
  }, [initialData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome completo" name="name" value={form.name} onChange={handleChange} required />
        <Input label="CPF ou CNPJ" name="document" value={form.document || ''} onChange={handleChange} />
        <Input label="Telefone" name="phone" value={form.phone || ''} onChange={handleChange} />
        <Input label="E-mail" type="email" name="email" value={form.email || ''} onChange={handleChange} />
        <Input label="Endereço" name="address" value={form.address || ''} onChange={handleChange} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Cidade" name="city" value={form.city || ''} onChange={handleChange} className="col-span-2" />
          <Input label="UF" name="state" value={form.state || ''} onChange={handleChange} maxLength={2} />
        </div>
        <Select label="Status" name="status" value={form.status} onChange={handleChange}>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </Select>
      </div>

      <Textarea label="Observações" name="notes" value={form.notes || ''} onChange={handleChange} />

      <div className="flex justify-end gap-3">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar cliente'}</Button>
      </div>
    </form>
  );
}
