-- Customer reviews for haedurio.com. Run in the Supabase SQL editor; running it again is safe.
-- Anyone can post a review from the site (/reviews/), and it shows right away.
-- Admins (users in admin_users) can hide, show again or delete reviews at /__admin__/reviews.html.
-- The quote or invoice number a reviewer gives is never public: only admins can read it.

create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 40),
  country     text check (char_length(country) <= 40),
  service     text check (service in ('book', 'shop', 'errand', 'lang', 'parcel', 'lost', 'other')),
  rating      smallint not null check (rating between 1 and 5),
  body        text not null check (char_length(body) between 10 and 1500),
  order_ref   text check (char_length(order_ref) <= 40),          -- quote or invoice number, admins only
  lang        text check (lang in ('en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'th')),
  status      text not null default 'published' check (status in ('published', 'hidden'))
);

create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- Tidy and check every new review before it is saved.
create or replace function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.name := btrim(new.name);
  new.country := nullif(btrim(coalesce(new.country, '')), '');
  new.body := btrim(new.body);
  new.order_ref := nullif(btrim(coalesce(new.order_ref, '')), '');
  new.created_at := now();
  new.status := 'published';

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

alter table public.reviews enable row level security;

drop policy if exists "Anyone can post a review" on public.reviews;
create policy "Anyone can post a review"
  on public.reviews
  for insert
  to anon, authenticated
  with check (status = 'published');

drop policy if exists "Anyone can read published reviews" on public.reviews;
create policy "Anyone can read published reviews"
  on public.reviews
  for select
  to anon
  using (status = 'published');

drop policy if exists "Admins read reviews" on public.reviews;
create policy "Admins read reviews"
  on public.reviews
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins hide or show reviews" on public.reviews;
create policy "Admins hide or show reviews"
  on public.reviews
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins delete reviews" on public.reviews;
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

-- Number of published reviews and their average rating, for the site.
create or replace function public.review_summary()
returns table (total integer, average numeric)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer, round(avg(rating), 1)
  from public.reviews
  where status = 'published';
$$;

revoke all on function public.review_summary() from public;
grant execute on function public.review_summary() to anon, authenticated, service_role;
