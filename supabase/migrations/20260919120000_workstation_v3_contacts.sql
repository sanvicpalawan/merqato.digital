-- ─────────────────────────────────────────────────────────────
-- merQato.digital — Team Workstation v3: client contact card
--
--  1. Re-asserts the workstation-assets bucket (images + video, 100 MB).
--     Paste this if uploads fail with "Bucket not found".
--  2. Adds client contact columns to workstation_subjects so every
--     client subject carries who to call / email, all clickable.
--
-- Safe to re-run. Paste into Supabase Dashboard > SQL Editor > Run.
-- ─────────────────────────────────────────────────────────────

-- 1. Bucket (images + video) ──
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

-- 2. Client contact columns (all optional, no backfill needed) ──
alter table public.workstation_subjects
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists contact_address text;

-- Row level security is row-based, so the existing team policies
-- automatically cover the new columns — no policy change needed.
