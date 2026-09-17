-- ─────────────────────────────────────────────────────────────
-- merQato.digital — Team Workstation schema
--
-- Creates the shared team board behind the backoffice "Team" tab:
-- study subjects with notes, comments, reference links (plain URLs and
-- Google Drive URLs) and images uploaded from a device.
--
-- Applied like every other migration in this folder — Lovable Cloud runs it
-- on the project; to apply it by hand, paste this file into
-- Supabase Dashboard > SQL Editor and run it.
--
-- Model: one row per study subject; comments/notes, links
-- (plain URLs and Google Drive URLs) and uploaded images hang off
-- the subject. Every row carries who posted it and when.
--
-- Identity is a display name + a per-browser author token (no login
-- required). The token is sent as the `x-author-token` request header
-- and is what lets someone delete their own posts without letting
-- them delete everyone else's.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.workstation_subjects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  summary      text,
  category     text,
  priority     text not null default 'moderate'
                 check (priority in ('urgent', 'moderate', 'downtime')),
  cover_path   text,                       -- object path inside workstation-assets
  created_by   text not null check (char_length(btrim(created_by)) between 1 and 60),
  author_token uuid not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.workstation_entries (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references public.workstation_subjects(id) on delete cascade,
  kind         text not null default 'comment' check (kind in ('comment', 'note')),
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  priority     text check (priority in ('urgent', 'moderate', 'downtime')),
  created_by   text not null check (char_length(btrim(created_by)) between 1 and 60),
  author_token uuid not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.workstation_links (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references public.workstation_subjects(id) on delete cascade,
  kind         text not null check (kind in ('url', 'drive')),
  url          text not null check (char_length(btrim(url)) between 4 and 2048),
  label        text,
  created_by   text not null check (char_length(btrim(created_by)) between 1 and 60),
  author_token uuid not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.workstation_attachments (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references public.workstation_subjects(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  content_type text,
  size_bytes   bigint,
  created_by   text not null check (char_length(btrim(created_by)) between 1 and 60),
  author_token uuid not null,
  created_at   timestamptz not null default now()
);

create index if not exists workstation_entries_subject_idx
  on public.workstation_entries (subject_id, created_at);
create index if not exists workstation_links_subject_idx
  on public.workstation_links (subject_id, created_at desc);
create index if not exists workstation_attachments_subject_idx
  on public.workstation_attachments (subject_id, created_at desc);
create index if not exists workstation_subjects_priority_idx
  on public.workstation_subjects (priority, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Keep updated_at honest
-- ─────────────────────────────────────────────────────────────

create or replace function public.workstation_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workstation_subjects_touch on public.workstation_subjects;
create trigger workstation_subjects_touch
  before update on public.workstation_subjects
  for each row execute function public.workstation_touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Identity helper
-- ─────────────────────────────────────────────────────────────

-- Reads the per-browser author token Supabase receives as a request header.
create or replace function public.workstation_author_token()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(
    current_setting('request.headers', true)::jsonb ->> 'x-author-token',
    ''
  )::uuid;
$$;

revoke all on function public.workstation_author_token() from public;
grant execute on function public.workstation_author_token() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row level security
-- ─────────────────────────────────────────────────────────────

alter table public.workstation_subjects    enable row level security;
alter table public.workstation_entries    enable row level security;
alter table public.workstation_links      enable row level security;
alter table public.workstation_attachments enable row level security;

-- Everyone who reached the backoffice can read the workstation.
-- (Tighten these once Supabase Auth is switched on for the team —
-- replace `using (true)` with an is_site_admin() check.)
drop policy if exists "Workstation subjects are readable by the team" on public.workstation_subjects;
create policy "Workstation subjects are readable by the team"
  on public.workstation_subjects for select to anon, authenticated using (true);

drop policy if exists "Workstation entries are readable by the team" on public.workstation_entries;
create policy "Workstation entries are readable by the team"
  on public.workstation_entries for select to anon, authenticated using (true);

drop policy if exists "Workstation links are readable by the team" on public.workstation_links;
create policy "Workstation links are readable by the team"
  on public.workstation_links for select to anon, authenticated using (true);

drop policy if exists "Workstation attachments are readable by the team" on public.workstation_attachments;
create policy "Workstation attachments are readable by the team"
  on public.workstation_attachments for select to anon, authenticated using (true);

-- Named team members may post.
drop policy if exists "Named team members can create subjects" on public.workstation_subjects;
create policy "Named team members can create subjects"
  on public.workstation_subjects for insert to anon, authenticated
  with check (public.workstation_author_token() is not null);

drop policy if exists "Named team members can post entries" on public.workstation_entries;
create policy "Named team members can post entries"
  on public.workstation_entries for insert to anon, authenticated
  with check (public.workstation_author_token() is not null);

drop policy if exists "Named team members can add links" on public.workstation_links;
create policy "Named team members can add links"
  on public.workstation_links for insert to anon, authenticated
  with check (public.workstation_author_token() is not null);

drop policy if exists "Named team members can attach images" on public.workstation_attachments;
create policy "Named team members can attach images"
  on public.workstation_attachments for insert to anon, authenticated
  with check (public.workstation_author_token() is not null);

-- Anyone can re-prioritise / edit a subject; only the author (or a listed
-- site admin) may remove it.
drop policy if exists "Team members can update subjects" on public.workstation_subjects;
create policy "Team members can update subjects"
  on public.workstation_subjects for update to anon, authenticated
  using (public.workstation_author_token() is not null)
  with check (public.workstation_author_token() is not null);

-- Author-only edits and deletes for posts, links and files.
drop policy if exists "Authors can update their own posts" on public.workstation_entries;
create policy "Authors can update their own posts"
  on public.workstation_entries for update to anon, authenticated
  using (author_token = public.workstation_author_token())
  with check (author_token = public.workstation_author_token());

drop policy if exists "Authors can delete their own posts" on public.workstation_entries;
create policy "Authors can delete their own posts"
  on public.workstation_entries for delete to anon, authenticated
  using (
    author_token = public.workstation_author_token()
    or exists (select 1 from public.site_admins where user_id = auth.uid())
  );

drop policy if exists "Authors can delete their own links" on public.workstation_links;
create policy "Authors can delete their own links"
  on public.workstation_links for delete to anon, authenticated
  using (
    author_token = public.workstation_author_token()
    or exists (select 1 from public.site_admins where user_id = auth.uid())
  );

drop policy if exists "Authors can delete their own attachments" on public.workstation_attachments;
create policy "Authors can delete their own attachments"
  on public.workstation_attachments for delete to anon, authenticated
  using (
    author_token = public.workstation_author_token()
    or exists (select 1 from public.site_admins where user_id = auth.uid())
  );

drop policy if exists "Authors or admins can delete subjects" on public.workstation_subjects;
create policy "Authors or admins can delete subjects"
  on public.workstation_subjects for delete to anon, authenticated
  using (
    author_token = public.workstation_author_token()
    or exists (select 1 from public.site_admins where user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Storage: workstation-assets (images uploaded from a device)
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workstation-assets',
  'workstation-assets',
  true,
  10485760, -- 10 MB per image
  array['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read so <img> tags work without signed URLs.
drop policy if exists "Workstation images are publicly readable" on storage.objects;
create policy "Workstation images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'workstation-assets');

-- Uploads live under <author-token>/<file>, which is what keeps one
-- teammate from deleting another's image.
drop policy if exists "Team members can upload workstation images" on storage.objects;
create policy "Team members can upload workstation images"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'workstation-assets'
    and (storage.foldername(name))[1] = public.workstation_author_token()::text
  );

drop policy if exists "Authors can delete their workstation images" on storage.objects;
create policy "Authors can delete their workstation images"
  on storage.objects for delete to anon, authenticated
  using (
    bucket_id = 'workstation-assets'
    and (storage.foldername(name))[1] = public.workstation_author_token()::text
  );
