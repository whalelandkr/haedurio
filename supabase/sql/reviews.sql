-- Customer reviews for haedurio.com. Run in the Supabase SQL editor; running it again is safe.
-- Anyone can post a review from the site (/reviews/), and it shows right away.
-- Admins (users in admin_users) can hide, show again or delete reviews at /__admin__/reviews.html.
-- The quote or invoice number a reviewer gives is never public: only admins can read it.
--
-- The old one-page site left a smaller reviews table (id, created_at, name, rating, content).
-- If it is there, this script keeps it and its rows and adds what the new site needs:
-- content is renamed to body, and rows that were already there start hidden, so an admin
-- can choose which ones to show.

-- 1. Old table: its review text column was called content.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'content')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'body') then
    alter table public.reviews rename column content to body;
  end if;
end
$$;

-- 2. New table (skipped when the old one is there).
create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null,
  rating      smallint not null,
  body        text not null
);

-- 3. Columns the new site needs. Rows already in an old table start hidden; new reviews are published.
alter table public.reviews add column if not exists created_at timestamptz default now();
alter table public.reviews add column if not exists name text;
alter table public.reviews add column if not exists rating smallint;
alter table public.reviews add column if not exists body text;
alter table public.reviews add column if not exists country text;     -- optional, shown
alter table public.reviews add column if not exists service text;     -- optional, shown: book, shop, errand, lang, parcel, lost, other
alter table public.reviews add column if not exists order_ref text;   -- optional quote or invoice number, admins only
alter table public.reviews add column if not exists lang text;        -- site language the review was written on
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'status') then
    alter table public.reviews add column status text not null default 'hidden';
    alter table public.reviews alter column status set default 'published';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_status_list') then
    alter table public.reviews add constraint reviews_status_list check (status in ('published', 'hidden'));
  end if;
end
$$;
alter table public.reviews alter column created_at set default now();

-- Any other column the old table required would block new reviews, so it becomes optional.
do $$
declare
  c record;
begin
  for c in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews' and is_nullable = 'NO'
      and column_default is null and is_identity = 'NO' and is_generated = 'NEVER'
      and column_name not in ('id', 'name', 'rating', 'body', 'status', 'created_at')
  loop
    execute format('alter table public.reviews alter column %I drop not null', c.column_name);
  end loop;
end
$$;

create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- 4. Check and tidy every new review before it is saved.
create or replace function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.name := btrim(coalesce(new.name, ''));
  new.country := nullif(btrim(coalesce(new.country, '')), '');
  new.body := btrim(coalesce(new.body, ''));
  new.order_ref := nullif(btrim(coalesce(new.order_ref, '')), '');
  new.created_at := now();
  new.status := 'published';

  if char_length(new.name) not between 1 and 40
     or new.rating is null or new.rating not between 1 and 5
     or char_length(new.body) not between 10 and 1500
     or char_length(coalesce(new.country, '')) > 40
     or char_length(coalesce(new.order_ref, '')) > 40
     or (new.service is not null and new.service not in ('book', 'shop', 'errand', 'lang', 'parcel', 'lost', 'other'))
     or (new.lang is not null and new.lang not in ('en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'th')) then
    raise exception 'invalid_review' using errcode = '23514';
  end if;

  -- No links: they are almost always spam.
  if new.body ~* '(https?://|www\.)' or new.name ~* '(https?://|www\.)' or coalesce(new.country, '') ~* '(https?://|www\.)' then
    raise exception 'links_not_allowed';
  end if;

  -- The same text posted twice.
  if exists (select 1 from public.reviews r where r.body = new.body and r.created_at > now() - interval '30 days') then
    raise exception 'duplicate_review';
  end if;

  -- A burst of reviews from a script.
  if (select count(*) from public.reviews r where r.created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'too_many_reviews';
  end if;

  return new;
end;
$$;

revoke all on function public.reviews_before_insert() from public, anon, authenticated;

drop trigger if exists reviews_before_insert on public.reviews;
create trigger reviews_before_insert
  before insert on public.reviews
  for each row execute function public.reviews_before_insert();

-- 5. Who can do what. Every older policy on this table is removed first.
alter table public.reviews enable row level security;

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'reviews' loop
    execute format('drop policy %I on public.reviews', p.policyname);
  end loop;
end
$$;

create policy "Anyone can post a review"
  on public.reviews
  for insert
  to anon, authenticated
  with check (status = 'published');

create policy "Anyone can read published reviews"
  on public.reviews
  for select
  to anon
  using (status = 'published');

create policy "Admins read reviews"
  on public.reviews
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins hide or show reviews"
  on public.reviews
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins delete reviews"
  on public.reviews
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- Visitors can write these columns and read only the public ones (no order_ref, no status).
revoke all on public.reviews from anon, authenticated;
grant insert (name, country, service, rating, body, order_ref, lang) on public.reviews to anon, authenticated;
grant select (id, created_at, name, country, service, rating, body, lang) on public.reviews to anon;
grant select, delete on public.reviews to authenticated;
grant update (status) on public.reviews to authenticated;
grant all on public.reviews to service_role;
do $$
declare
  s text := pg_get_serial_sequence('public.reviews', 'id');
begin
  if s is not null then
    execute format('grant usage, select on sequence %s to anon, authenticated, service_role', s);
  end if;
end
$$;

-- 6. Number of published reviews and their average rating, for the site.
create or replace function public.review_summary()
returns table (total integer, average numeric)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer, round(avg(rating)::numeric, 1)
  from public.reviews
  where status = 'published';
$$;

revoke all on function public.review_summary() from public;
grant execute on function public.review_summary() to anon, authenticated, service_role;
