import { supabase } from './supabase.js';

export async function listUserProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function updateUserProfile(id, payload) {
  const cleanPayload = {
    name: payload.name?.trim() || null,
    role: payload.role,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(cleanPayload)
    .eq('id', id)
    .select('id, name, email, role, created_at, updated_at')
    .single();

  if (error) throw error;

  return data;
}