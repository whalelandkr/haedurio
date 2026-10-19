-- Payment links for Haedurio. Run once in the Supabase SQL editor.
-- Admins (signed-in users) manage orders from /__admin__/payments.html.
-- Customers never read this table directly; the pay-order edge function does.

create table if not exists public.pay_orders (
  id              bigint generated always as identity primary key,
  code            text not null unique
                  default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  title           text not null check (char_length(title) between 2 and 80),
  amount          integer not null check (amount between 1000 and 5000000),
  currency        text not null default 'KRW' check (currency = 'KRW'),
  lang            text not null default 'en'
                  check (lang in ('en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'th')),
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  memo            text,
  test            boolean not null default false,
  status          text not null default 'open'
                  check (status in ('open', 'paid', 'cancelled', 'refunded')),
  last_payment_id text,
  payment_id      text,
  pay_method      text,
  paid_at         timestamptz,
  last_error      text,
  expires_at      timestamptz not null default now() + interval '7 days',
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);

create index if not exists pay_orders_created_at_idx on public.pay_orders (created_at desc);

alter table public.pay_orders enable row level security;

drop policy if exists "Signed-in admins manage pay orders" on public.pay_orders;
create policy "Signed-in admins manage pay orders"
  on public.pay_orders
  for all
  to authenticated
  using (true)
  with check (true);
