import { supabase, requireCurrentUser } from './supabase.js';

export async function listClients(search = '') {
  await requireCurrentUser();
  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  const term = search.trim();
  if (term) {
    query = query.or(`name.ilike.%${term}%,document.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClient(payload) {
  const user = await requireCurrentUser();
  validateClient(payload);

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...sanitizeClient(payload), user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(id, payload) {
  validateClient(payload);

  const { data, error } = await supabase
    .from('clients')
    .update(sanitizeClient(payload))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function inactivateClient(id) {
  const { data, error } = await supabase
    .from('clients')
    .update({ status: 'inactive' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

function validateClient(client) {
  if (!client.name?.trim()) throw new Error('Nome completo é obrigatório.');
}

function sanitizeClient(client) {
  return {
    name: client.name?.trim(),
    document: client.document?.trim() || null,
    phone: client.phone?.trim() || null,
    email: client.email?.trim() || null,
    address: client.address?.trim() || null,
    city: client.city?.trim() || null,
    state: client.state?.trim() || null,
    notes: client.notes?.trim() || null,
    status: client.status || 'active',
  };
}
