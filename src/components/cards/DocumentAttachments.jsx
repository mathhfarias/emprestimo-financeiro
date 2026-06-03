import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileText,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import PermissionGate from '../ui/PermissionGate.jsx';
import Textarea from '../ui/Textarea.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  deleteDocumentAttachment,
  downloadDocumentAttachment,
  getDocumentAttachmentSignedUrl,
  listDocumentAttachments,
  uploadDocumentAttachment,
} from '../../services/documentAttachmentsService.js';
import { getFriendlySupabaseError } from '../../services/supabase.js';
import { formatDate } from '../../utils/formatters.js';
import { PERMISSIONS } from '../../utils/permissions.js';

export default function DocumentAttachments({
  targetType,
  targetId,
  title = 'Anexos de documentos',
  description = 'Guarde documentos importantes vinculados a este registro.',
}) {
  const { hasPermission } = useAuth();
  const fileInputRef = useRef(null);

  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canUpload = hasPermission(PERMISSIONS.DOCUMENT_CREATE);
  const canDelete = hasPermission(PERMISSIONS.DOCUMENT_DELETE);

  useEffect(() => {
    loadAttachments();
  }, [targetType, targetId]);

  async function loadAttachments() {
    try {
      setLoading(true);
      setError('');

      const data = await listDocumentAttachments({ targetType, targetId });
      setAttachments(data);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] || null);
    setSuccess('');
    setError('');
  }

  async function handleUpload(event) {
    event.preventDefault();

    try {
      if (!canUpload) {
        setError('Você não tem permissão para anexar documentos.');
        return;
      }

      setSaving(true);
      setError('');
      setSuccess('');

      await uploadDocumentAttachment({
        targetType,
        targetId,
        file: selectedFile,
        description: attachmentDescription,
      });

      setSelectedFile(null);
      setAttachmentDescription('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setSuccess('Documento anexado com sucesso.');
      await loadAttachments();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleOpen(attachment) {
    try {
      setActionId(attachment.id);
      setError('');

      const signedUrl = await getDocumentAttachmentSignedUrl(attachment);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setActionId('');
    }
  }

  async function handleDownload(attachment) {
    try {
      setActionId(attachment.id);
      setError('');

      const blob = await downloadDocumentAttachment(attachment);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = attachment.file_name || 'documento';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setActionId('');
    }
  }

  async function handleDelete(attachment) {
    const confirmed = window.confirm(
      `Remover o anexo "${attachment.file_name}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      if (!canDelete) {
        setError('Você não tem permissão para remover anexos.');
        return;
      }

      setActionId(attachment.id);
      setError('');
      setSuccess('');

      await deleteDocumentAttachment(attachment, targetType);
      setSuccess('Documento removido com sucesso.');
      await loadAttachments();
    } catch (err) {
      setError(getFriendlySupabaseError(err));
    } finally {
      setActionId('');
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Paperclip size={18} className="text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {attachments.length} {attachments.length === 1 ? 'arquivo' : 'arquivos'}
        </span>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <PermissionGate permission={PERMISSIONS.DOCUMENT_CREATE}>
        <form
          className="grid gap-3 rounded-2xl bg-slate-50 p-4"
          onSubmit={handleUpload}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Input
              ref={fileInputRef}
              label="Arquivo"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />

            <Button type="submit" disabled={saving || !selectedFile}>
              <Upload size={16} />
              {saving ? 'Enviando...' : 'Anexar'}
            </Button>
          </div>

          <Textarea
            label="Descrição opcional"
            placeholder="Ex.: RG frente, comprovante de residência, contrato assinado..."
            value={attachmentDescription}
            onChange={(event) => setAttachmentDescription(event.target.value)}
            rows={2}
          />

          <p className="text-xs text-slate-500">
            Formatos aceitos: PDF, imagens, DOC e DOCX. Tamanho máximo: 10 MB.
          </p>
        </form>
      </PermissionGate>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando anexos...</p>
      ) : attachments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
          <FileText className="mx-auto text-slate-300" size={32} />
          <h3 className="mt-2 text-sm font-bold text-slate-800">
            Nenhum documento anexado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Use este espaço para guardar documentos importantes com segurança.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {attachments.map((attachment) => (
            <article
              key={attachment.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="shrink-0 text-slate-500" />
                  <p className="truncate text-sm font-bold text-slate-900">
                    {attachment.file_name}
                  </p>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{formatFileSize(attachment.size_bytes)}</span>
                  <span>{formatMimeType(attachment.mime_type)}</span>
                  <span>{formatDate(attachment.created_at?.slice(0, 10))}</span>
                </div>

                {attachment.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    {attachment.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => handleOpen(attachment)}
                  disabled={actionId === attachment.id}
                >
                  <Eye size={15} /> Abrir
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleDownload(attachment)}
                  disabled={actionId === attachment.id}
                >
                  <Download size={15} /> Baixar
                </Button>

                <PermissionGate permission={PERMISSIONS.DOCUMENT_DELETE}>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(attachment)}
                    disabled={actionId === attachment.id}
                  >
                    <Trash2 size={15} /> Excluir
                  </Button>
                </PermissionGate>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatFileSize(sizeBytes) {
  const size = Number(sizeBytes || 0);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMimeType(mimeType) {
  if (!mimeType) return 'Arquivo';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Imagem';
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
    return 'Word';
  }

  return mimeType;
}
