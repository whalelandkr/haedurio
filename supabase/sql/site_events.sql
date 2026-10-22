-- Anonymous visit statistics for haedurio.com. Run once in the Supabase SQL editor.
-- The site records page views and taps on contact links (no cookies, no personal data).
-- Anyone can add a row; only admins (users in admin_users) can read them,
-- from /__admin__/analytics.html.

create table if not exists public.site_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('view', 'click', 'submit')),
  path        text not null check (char_length(path) between 1 and 200),
  lang        text check (lang in ('en', 'ja', 'zh-cn', 'zh-tw', 'vi', 'th')),
  source      text check (char_length(source) <= 100),   -- utm_source, or the referring site's host
  medium      text check (char_length(medium) <= 60),   -- utm_medium
  campaign    text check (char_length(campaign) <= 80),  -- utm_campaign
  target      text check (char_length(target) <= 40),    -- what was tapped: whatsapp, line, kakao, …
  device      text check (device in ('mobile', 'tablet', 'desktop')),
  sid         text not null check (char_length(sid) between 8 and 32) -- random code kept in one browser tab
);

create index if not exists site_events_created_at_idx on public.site_events (created_at desc);

alter table public.site_events enable row level security;

drop policy if exists "Anyone can record site events" on public.site_events;
create policy "Anyone can record site events"
  on public.site_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins read site events" on public.site_events;
create policy "Admins read site events"
  on public.site_events
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

revoke all on public.site_events from anon, authenticated;
grant insert (type, path, lang, source, medium, campaign, target, device, sid) on public.site_events to anon, authenticated;
grant select on public.site_events to authenticated;
grant all on public.site_events to service_role;
do $$
begin
  execute format('grant usage on sequence %s to anon, authenticated, service_role',
                 pg_get_serial_sequence('public.site_events', 'id'));
end
$$;

-- Statistics older than 2 years are deleted (the privacy policy promises this).
-- Run by hand now and then, or schedule it with pg_cron if it is enabled:
--   delete from public.site_events where created_at < now() - interval '2 years';
