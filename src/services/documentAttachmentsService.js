import { supabase, requireCurrentUser } from './supabase.js';

export const DOCUMENTS_BUCKET = 'documents';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const TARGET_CONFIG = {
  client: {
    folder: 'clientes',
    idColumn: 'client_id',
    auditEntity: 'clients',
    label: 'cliente',
  },
  loan: {
    folder: 'emprestimos',
    idColumn: 'loan_id',
    auditEntity: 'loans',
    label: 'empréstimo',
  },
};

export async function listDocumentAttachments({ targetType, targetId }) {
  await requireCurrentUser();

  const config = getTargetConfig(targetType);

  if (!targetId) {
    return [];
  }

  const { data, error } = await supabase
    .from('document_attachments')
    .select(
      'id, owner_id, user_id, client_id, loan_id, file_name, storage_path, mime_type, size_bytes, description, created_at, uploaded_by'
    )
    .eq(config.idColumn, targetId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function uploadDocumentAttachment({
  targetType,
  targetId,
  file,
  description,
}) {
  const user = await requireCurrentUser();
  const config = getTargetConfig(targetType);

  validateAttachment({ targetId, file, targetLabel: config.label });

  const storagePath = buildStoragePath({
    userId: user.id,
    folder: config.folder,
    targetId,
    fileName: file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const insertPayload = {
    owner_id: user.id,
    user_id: user.id,
    uploaded_by: user.id,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    description: description?.trim() || null,
    client_id: targetType === 'client' ? targetId : null,
    loan_id: targetType === 'loan' ? targetId : null,
  };

  const { data, error: insertError } = await supabase
    .from('document_attachments')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw insertError;
  }

  await writeAuditLog({
    action: 'document_uploaded',
    entity: config.auditEntity,
    entityId: targetId,
    description: `Anexo enviado: ${file.name}`,
  });

  return data;
}

export async function deleteDocumentAttachment(attachment, targetType) {
  await requireCurrentUser();
  const config = getTargetConfig(targetType);

  if (!attachment?.id || !attachment?.storage_path) {
    throw new Error('Anexo inválido para exclusão.');
  }

  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([attachment.storage_path]);

  if (storageError) throw storageError;

  const { error: deleteError } = await supabase
    .from('document_attachments')
    .delete()
    .eq('id', attachment.id);

  if (deleteError) throw deleteError;

  await writeAuditLog({
    action: 'document_deleted',
    entity: config.auditEntity,
    entityId: attachment[config.idColumn],
    description: `Anexo removido: ${attachment.file_name}`,
  });
}

export async function getDocumentAttachmentSignedUrl(attachment) {
  await requireCurrentUser();

  if (!attachment?.storage_path) {
    throw new Error('Arquivo não encontrado.');
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(attachment.storage_path, 60);

  if (error) throw error;

  return data?.signedUrl;
}

export async function downloadDocumentAttachment(attachment) {
  await requireCurrentUser();

  if (!attachment?.storage_path) {
    throw new Error('Arquivo não encontrado.');
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(attachment.storage_path);

  if (error) throw error;

  return data;
}

function getTargetConfig(targetType) {
  const config = TARGET_CONFIG[targetType];

  if (!config) {
    throw new Error('Tipo de vínculo de anexo inválido.');
  }

  return config;
}

function validateAttachment({ targetId, file, targetLabel }) {
  if (!targetId) {
    throw new Error(`Selecione um ${targetLabel} para anexar documentos.`);
  }

  if (!file) {
    throw new Error('Selecione um arquivo para anexar.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('O arquivo deve ter no máximo 10 MB.');
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Formato não permitido. Use PDF, imagem, DOC ou DOCX.');
  }
}

function buildStoragePath({ userId, folder, targetId, fileName }) {
  const safeName = sanitizeFileName(fileName);
  const randomPart =
    globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

  return `${userId}/${folder}/${targetId}/${Date.now()}-${randomPart}-${safeName}`;
}

function sanitizeFileName(fileName) {
  const cleanName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return cleanName || 'documento';
}

async function writeAuditLog({ action, entity, entityId, description }) {
  try {
    const user = await requireCurrentUser();

    const payload = {
      user_id: user.id,
      action,
      entity,
      entity_id: entityId,
      description,
    };

    const { error } = await supabase.from('audit_logs').insert(payload);

    if (!error) return;

    // Compatibilidade para bancos que usam owner_id em vez de user_id.
    if (error.code === '42703' || String(error.message || '').includes('user_id')) {
      const { error: ownerError } = await supabase.from('audit_logs').insert({
        owner_id: user.id,
        action,
        entity,
        entity_id: entityId,
        description,
      });

      if (ownerError) throw ownerError;
      return;
    }

    throw error;
  } catch (error) {
    console.warn('[AUDIT LOG DOCUMENT ATTACHMENT]', error);
  }
}
