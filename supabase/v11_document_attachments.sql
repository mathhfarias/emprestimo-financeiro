-- V11 / Item 7 - Anexos de documentos com Supabase Storage
-- Versão compatível com bancos que usam user_id OU owner_id.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Importante: este script NÃO depende de FK para public.loans/public.clients,
-- para evitar erro em bases que já existem com nomes/colunas diferentes.

create extension if not exists "pgcrypto";

-- 1) Bucket privado para documentos
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'documents',
  'documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Metadados dos anexos
-- Mantemos owner_id e user_id para compatibilidade:
-- - sistemas antigos costumam usar owner_id;
-- - a versão enviada anteriormente usava user_id.
create table if not exists public.document_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  client_id uuid,
  loan_id uuid,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_attachments_target_check check (
    (client_id is not null and loan_id is null)
    or
    (client_id is null and loan_id is not null)
  )
);

-- Garante compatibilidade caso a tabela já exista parcialmente.
alter table public.document_attachments
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists client_id uuid,
  add column if not exists loan_id uuid,
  add column if not exists file_name text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint not null default 0,
  add column if not exists description text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill entre owner_id e user_id quando uma das duas colunas já tiver valor.
update public.document_attachments
set owner_id = user_id
where owner_id is null
  and user_id is not null;

update public.document_attachments
set user_id = owner_id
where user_id is null
  and owner_id is not null;

alter table public.document_attachments
  drop constraint if exists document_attachments_target_check;

alter table public.document_attachments
  add constraint document_attachments_target_check check (
    (client_id is not null and loan_id is null)
    or
    (client_id is null and loan_id is not null)
  );

create unique index if not exists idx_document_attachments_storage_path
on public.document_attachments(storage_path);

create index if not exists idx_document_attachments_owner_id
on public.document_attachments(owner_id);

create index if not exists idx_document_attachments_user_id
on public.document_attachments(user_id);

create index if not exists idx_document_attachments_client_id
on public.document_attachments(client_id);

create index if not exists idx_document_attachments_loan_id
on public.document_attachments(loan_id);

create index if not exists idx_document_attachments_created_at
on public.document_attachments(created_at desc);

-- 3) Trigger para manter owner_id/user_id sincronizados e atualizar updated_at.
create or replace function public.sync_document_attachment_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.owner_id is null and new.user_id is not null then
    new.owner_id := new.user_id;
  end if;

  if new.user_id is null and new.owner_id is not null then
    new.user_id := new.owner_id;
  end if;

  if new.owner_id is null and new.user_id is null then
    new.owner_id := auth.uid();
    new.user_id := auth.uid();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_document_attachment_owner on public.document_attachments;
create trigger sync_document_attachment_owner
before insert or update on public.document_attachments
for each row execute function public.sync_document_attachment_owner();

-- 4) RLS dos metadados
alter table public.document_attachments enable row level security;

drop policy if exists "document_attachments_select_own" on public.document_attachments;
create policy "document_attachments_select_own"
on public.document_attachments for select
to authenticated
using (coalesce(owner_id, user_id) = auth.uid());

drop policy if exists "document_attachments_insert_own" on public.document_attachments;
create policy "document_attachments_insert_own"
on public.document_attachments for insert
to authenticated
with check (coalesce(owner_id, user_id, auth.uid()) = auth.uid());

drop policy if exists "document_attachments_update_own" on public.document_attachments;
create policy "document_attachments_update_own"
on public.document_attachments for update
to authenticated
using (coalesce(owner_id, user_id) = auth.uid())
with check (coalesce(owner_id, user_id, auth.uid()) = auth.uid());

drop policy if exists "document_attachments_delete_own" on public.document_attachments;
create policy "document_attachments_delete_own"
on public.document_attachments for delete
to authenticated
using (coalesce(owner_id, user_id) = auth.uid());

-- 5) RLS do Storage
-- Regra: todo arquivo fica dentro da pasta do usuário autenticado:
-- {auth.uid()}/clientes/{client_id}/arquivo.pdf
-- {auth.uid()}/emprestimos/{loan_id}/arquivo.pdf

drop policy if exists "documents_storage_select_own_folder" on storage.objects;
create policy "documents_storage_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documents_storage_insert_own_folder" on storage.objects;
create policy "documents_storage_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documents_storage_update_own_folder" on storage.objects;
create policy "documents_storage_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documents_storage_delete_own_folder" on storage.objects;
create policy "documents_storage_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
