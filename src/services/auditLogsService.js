import { supabase } from './supabase.js';

export async function listAuditLogsByEntity(entity, entityId, limit = 50) {
  let query = supabase
    .from('audit_logs')
    .select(
      'id, user_id, actor_name, action, entity, entity_id, description, metadata, created_at'
    )
    .eq('entity', entity)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}