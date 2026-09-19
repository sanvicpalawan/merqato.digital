-- ─────────────────────────────────────────────────────────────
-- merQato.digital — Team Workstation v2: full workstation upgrade
--
-- What this does:
--  1. Notes/comments body limit 4,000 -> 20,000 chars (more writing space).
--  2. workstation-assets bucket: 10 MB -> 100 MB + allow video MIME types
--     so staff can upload multiple images AND videos from device.
--  3. Links stay in workstation_links — no schema change needed for
--     multiple URLs / multiple Google Drive URLs (each URL = one row,
--     bulk insert is done client-side).
--
-- How to apply (you own the Lovable-hosted Supabase):
--  Supabase Dashboard > SQL Editor > paste this file > Run.
--  Safe to re-run (all statements are IF NOT EXISTS / OR REPLACE /
--  DROP IF EXISTS + CREATE).
-- ─────────────────────────────────────────────────────────────

-- 1. More writing space for notes & comments ──
alter table public.workstation_entries
  drop constraint if exists workstation_entries_body_check;

alter table public.workstation_entries
  add constraint workstation_entries_body_check
  check (char_length(btrim(body)) between 1 and 20000);

-- 2. Images + video in workstation-assets ──
-- Bucket must exist first (created in the v1 migration).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workstation-assets',
  'workstation-assets',
  true,
  104857600, -- 100 MB per file (covers video from device)
  array[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
    'image/webp', 'image/avif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'video/x-m4v', 'video/mpeg', 'video/ogg', 'video/x-msvideo'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies from v1 already allow <author-token>/<file> uploads,
-- deletes and public reads for any file in this bucket, so no policy
-- change is needed — the bucket MIME + size update above is enough.
-- Re-assert them here so a partial v1 apply still ends up correct.

drop policy if exists "Workstation images are publicly readable" on storage.objects;
create policy "Workstation images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'workstation-assets');

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
