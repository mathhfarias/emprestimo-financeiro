-- Sistema de Controle de Empréstimos Financeiros
-- Supabase PostgreSQL + Auth + RLS
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

-- =============================
-- 1. Funções utilitárias
-- =============================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================
-- 2. Tabelas
-- =============================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_status_check check (status in ('active', 'inactive'))
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete restrict,
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  monthly_interest_rate numeric(8,4) not null check (monthly_interest_rate >= 0),
  installments_count integer not null check (installments_count > 0),
  installment_amount numeric(14,2) not null check (installment_amount >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  start_date date not null,
  first_due_date date not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_status_check check (status in ('active', 'paid', 'overdue', 'cancelled'))
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  payment_date date,
  paid_amount numeric(14,2) check (paid_amount is null or paid_amount >= 0),
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installments_status_check check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  constraint installments_loan_number_unique unique (loan_id, installment_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_id uuid not null references public.installments(id) on delete restrict,
  loan_id uuid not null references public.loans(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text,
  entity text,
  entity_id uuid,
  description text,
  created_at timestamptz not null default now()
);

-- =============================
-- 3. Triggers de updated_at
-- =============================

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists set_loans_updated_at on public.loans;
create trigger set_loans_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists set_installments_updated_at on public.installments;
create trigger set_installments_updated_at
before update on public.installments
for each row execute function public.set_updated_at();

-- =============================
-- 4. Profile automático ao criar usuário
-- =============================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'admin'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =============================
-- 5. Atualização automática de atrasados/status
-- =============================

create or replace function public.refresh_loan_status(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_paid integer;
  v_overdue integer;
  v_current_status text;
begin
  select status into v_current_status
  from public.loans
  where id = p_loan_id;

  if v_current_status = 'cancelled' then
    return;
  end if;

  update public.installments
  set status = 'overdue'
  where loan_id = p_loan_id
    and status = 'pending'
    and due_date < current_date;

  select
    count(*),
    count(*) filter (where status = 'paid'),
    count(*) filter (where status = 'overdue')
  into v_total, v_paid, v_overdue
  from public.installments
  where loan_id = p_loan_id
    and status <> 'cancelled';

  update public.loans
  set status = case
    when v_total > 0 and v_total = v_paid then 'paid'
    when v_overdue > 0 then 'overdue'
    else 'active'
  end
  where id = p_loan_id
    and status <> 'cancelled';
end;
$$;

create or replace function public.refresh_loan_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_loan_status(old.loan_id);
    return old;
  end if;

  perform public.refresh_loan_status(new.loan_id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_loan_status_after_installment_change on public.installments;
create trigger trg_refresh_loan_status_after_installment_change
after insert or update or delete on public.installments
for each row execute function public.refresh_loan_status_trigger();

create or replace function public.refresh_overdue_installments()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.installments
  set status = 'overdue'
  where user_id = auth.uid()
    and status = 'pending'
    and due_date < current_date;

  update public.loans l
  set status = 'overdue'
  where l.user_id = auth.uid()
    and l.status = 'active'
    and exists (
      select 1 from public.installments i
      where i.loan_id = l.id
        and i.status = 'overdue'
    );
end;
$$;

create or replace function public.register_installment_payment(
  p_installment_id uuid,
  p_paid_amount numeric,
  p_payment_date date,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment public.installments%rowtype;
  v_loan public.loans%rowtype;
  v_payment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_paid_amount is null or p_paid_amount <= 0 then
    raise exception 'O valor pago deve ser maior que zero.';
  end if;

  select * into v_installment
  from public.installments
  where id = p_installment_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Parcela não encontrada ou sem permissão.';
  end if;

  if v_installment.status = 'paid' then
    raise exception 'Esta parcela já está paga.';
  end if;

  if v_installment.status = 'cancelled' then
    raise exception 'Não é possível pagar uma parcela cancelada.';
  end if;

  select * into v_loan
  from public.loans
  where id = v_installment.loan_id
    and user_id = auth.uid();

  update public.installments
  set
    status = 'paid',
    paid_amount = p_paid_amount,
    payment_date = p_payment_date,
    notes = coalesce(p_notes, notes)
  where id = p_installment_id;

  insert into public.payments (
    user_id,
    installment_id,
    loan_id,
    client_id,
    amount,
    payment_date,
    notes
  ) values (
    auth.uid(),
    p_installment_id,
    v_installment.loan_id,
    v_loan.client_id,
    p_paid_amount,
    p_payment_date,
    p_notes
  )
  returning id into v_payment_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, description)
  values (auth.uid(), 'payment_registered', 'installments', p_installment_id, 'Pagamento de parcela registrado.');

  perform public.refresh_loan_status(v_installment.loan_id);

  return v_payment_id;
end;
$$;

-- =============================
-- 6. Row Level Security
-- =============================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.loans enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Clients

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
on public.clients for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
on public.clients for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
on public.clients for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
on public.clients for delete
to authenticated
using (user_id = auth.uid());

-- Loans

drop policy if exists "loans_select_own" on public.loans;
create policy "loans_select_own"
on public.loans for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "loans_insert_own" on public.loans;
create policy "loans_insert_own"
on public.loans for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "loans_update_own" on public.loans;
create policy "loans_update_own"
on public.loans for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "loans_delete_own" on public.loans;
create policy "loans_delete_own"
on public.loans for delete
to authenticated
using (user_id = auth.uid());

-- Installments

drop policy if exists "installments_select_own" on public.installments;
create policy "installments_select_own"
on public.installments for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "installments_insert_own" on public.installments;
create policy "installments_insert_own"
on public.installments for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "installments_update_own" on public.installments;
create policy "installments_update_own"
on public.installments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "installments_delete_own" on public.installments;
create policy "installments_delete_own"
on public.installments for delete
to authenticated
using (user_id = auth.uid());

-- Payments

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
on public.payments for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own"
on public.payments for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own"
on public.payments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "payments_delete_own" on public.payments;
create policy "payments_delete_own"
on public.payments for delete
to authenticated
using (user_id = auth.uid());

-- Audit logs

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own"
on public.audit_logs for insert
to authenticated
with check (user_id = auth.uid());

-- =============================
-- 7. Índices
-- =============================

create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_clients_name on public.clients using gin (to_tsvector('portuguese', coalesce(name, '')));
create index if not exists idx_clients_document on public.clients(document);
create index if not exists idx_clients_phone on public.clients(phone);

create index if not exists idx_loans_user_id on public.loans(user_id);
create index if not exists idx_loans_client_id on public.loans(client_id);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_loans_start_date on public.loans(start_date);

create index if not exists idx_installments_user_id on public.installments(user_id);
create index if not exists idx_installments_loan_id on public.installments(loan_id);
create index if not exists idx_installments_status on public.installments(status);
create index if not exists idx_installments_due_date on public.installments(due_date);
create index if not exists idx_installments_user_due_status on public.installments(user_id, due_date, status);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_loan_id on public.payments(loan_id);
create index if not exists idx_payments_client_id on public.payments(client_id);
create index if not exists idx_payments_payment_date on public.payments(payment_date);

create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id);
