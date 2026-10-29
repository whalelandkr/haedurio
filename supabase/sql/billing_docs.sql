-- Quotes and invoices for Haedurio. Run once in the Supabase SQL editor.
-- Admins (users in admin_users) issue them from /__admin__/documents.html.
-- Customers never read these tables: admins save the document as a PDF and send it themselves.
-- Bank details live only in billing_settings, never in the site code.

-- One row of defaults that fill every new document (기본정보 설정 on the page).
create table if not exists public.billing_settings (
  id          smallint primary key default 1 check (id = 1),
  issuer      jsonb not null default '{}'::jsonb,  -- company, brand, address, registration, contact, in Korean and English
  bank        jsonb not null default '{}'::jsonb,  -- bank, holder, account, SWIFT, bank address
  contact     text,                                -- (first version) default contact line; now kept in prefs
  prefs       jsonb not null default '{}'::jsonb,  -- our contact person (ko/en), bank charges, days until due
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
alter table public.billing_settings add column if not exists prefs jsonb not null default '{}'::jsonb;

-- Last number used per prefix and year (Q-2026-0001, INV-2026-0001).
create table if not exists public.billing_counters (
  prefix  text not null,
  year    integer not null,
  last    integer not null default 0,
  primary key (prefix, year)
);

create table if not exists public.billing_docs (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('quote', 'invoice')),
  number      text unique,
  status      text not null default 'draft'
              check (status in ('draft', 'issued', 'accepted', 'paid', 'void')),
  currency    text not null default 'USD' check (currency in ('USD', 'KRW')),
  issue_date  date not null default ((now() at time zone 'Asia/Seoul')::date),
  due_date    date,                                 -- quote: valid until, invoice: payment due
  title       text check (char_length(title) <= 200),
  client      jsonb not null default '{}'::jsonb,   -- name, company, email, address
  data        jsonb not null default '{}'::jsonb,   -- items, details, terms shown on the document
  total       numeric(14, 2) not null default 0,
  source_id   bigint references public.billing_docs (id) on delete set null,  -- invoice made from this quote
  memo        text,                                 -- internal note, never printed
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

create index if not exists billing_docs_created_at_idx on public.billing_docs (created_at desc);

-- The page proposes the next number (Q-2026-0001, INV-2026-0001) and people can correct it while the document is a draft.
-- A document saved without a number gets the next free one here.
create or replace function public.billing_docs_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p text := case new.kind when 'quote' then 'Q' else 'INV' end;
  y integer := extract(year from coalesce(new.issue_date, (now() at time zone 'Asia/Seoul')::date))::integer;
  n integer;
  candidate text;
begin
  new.number := nullif(btrim(new.number), '');
  if new.number is null then
    loop
      insert into public.billing_counters as c (prefix, year, last)
      values (p, y, 1)
      on conflict (prefix, year) do update set last = c.last + 1
      returning c.last into n;
      candidate := p || '-' || y || '-' || lpad(n::text, 4, '0');
      exit when not exists (select 1 from public.billing_docs d where d.number = candidate);
    end loop;
    new.number := candidate;
  end if;
  return new;
end
$$;

create or replace function public.billing_docs_touch()
returns trigger
language plpgsql
as $$
begin
  -- An issued document stays on record: it can be marked void, but not turned back into a deletable draft.
  if old.status <> 'draft' and new.status = 'draft' then
    raise exception 'Document % has been issued and cannot go back to draft. Mark it void instead.', old.number
      using errcode = 'check_violation';
  end if;
  -- Once issued, a document keeps what the customer received: only its status, internal memo and payment time can change.
  -- To correct one, duplicate it as a new draft and mark this one void. A void document stays void.
  if old.status <> 'draft' then
    if (new.data, new.client, new.total, new.currency, new.issue_date, new.due_date, new.title, new.source_id)
       is distinct from (old.data, old.client, old.total, old.currency, old.issue_date, old.due_date, old.title, old.source_id) then
      raise exception 'Document % has been issued and its content cannot change. Duplicate it as a new draft and mark this one void.', old.number
        using errcode = 'check_violation';
    end if;
    if old.status = 'void' and new.status <> 'void' then
      raise exception 'Document % is void and stays void.', old.number
        using errcode = 'check_violation';
    end if;
  end if;
  new.updated_at := now();
  new.kind := old.kind;
  -- A draft's number can still be corrected. Once issued, the number never changes.
  if old.status <> 'draft' or nullif(btrim(new.number), '') is null then
    new.number := old.number;
  end if;
  return new;
end
$$;

create or replace function public.billing_settings_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;

drop trigger if exists billing_docs_number on public.billing_docs;
create trigger billing_docs_number
  before insert on public.billing_docs
  for each row execute function public.billing_docs_number();

drop trigger if exists billing_docs_touch on public.billing_docs;
create trigger billing_docs_touch
  before update on public.billing_docs
  for each row execute function public.billing_docs_touch();

drop trigger if exists billing_settings_touch on public.billing_settings;
create trigger billing_settings_touch
  before insert or update on public.billing_settings
  for each row execute function public.billing_settings_touch();

-- Only admins, the same check as inquiries and pay_orders.
alter table public.billing_settings enable row level security;
alter table public.billing_counters enable row level security;
alter table public.billing_docs enable row level security;

drop policy if exists "Admins manage billing settings" on public.billing_settings;
create policy "Admins manage billing settings"
  on public.billing_settings
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins read billing docs" on public.billing_docs;
create policy "Admins read billing docs"
  on public.billing_docs
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins add billing docs" on public.billing_docs;
create policy "Admins add billing docs"
  on public.billing_docs
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins edit billing docs" on public.billing_docs;
create policy "Admins edit billing docs"
  on public.billing_docs
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Drafts can be deleted. Issued documents are kept and marked void instead.
drop policy if exists "Admins delete draft billing docs" on public.billing_docs;
create policy "Admins delete draft billing docs"
  on public.billing_docs
  for delete
  to authenticated
  using (public.is_admin(auth.uid()) and status = 'draft');

-- billing_counters has no policies: only the numbering trigger touches it.
-- Start from nothing (Supabase grants everything by default), then allow only what the page uses.
revoke all on public.billing_settings, public.billing_counters, public.billing_docs from anon, authenticated;
grant select, insert, update on public.billing_settings to authenticated;
grant select, insert, update, delete on public.billing_docs to authenticated;
grant all on public.billing_settings, public.billing_counters, public.billing_docs to service_role;
do $$
begin
  execute format('grant usage, select on sequence %s to authenticated, service_role',
                 pg_get_serial_sequence('public.billing_docs', 'id'));
end
$$;
