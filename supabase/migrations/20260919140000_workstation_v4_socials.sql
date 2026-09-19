-- ─────────────────────────────────────────────────────────────
-- merQato.digital — Team Workstation v4: client socials directory
--
-- Adds workstation_socials: one row per client social profile
-- (Facebook, Instagram, YouTube, TikTok, X, LinkedIn, Website…),
-- so the team stops looking up socials and a future agent can read
-- structured client data. Same identity model as links.
--
-- Safe to re-run. Paste into Supabase Dashboard > SQL Editor > Run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.workstation_socials (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references public.workstation_subjects(id) on delete cascade,
  platform     text not null
                 check (platform in (
                   'Facebook', 'Instagram', 'YouTube', 'TikTok',
                   'X', 'LinkedIn', 'Website', 'Other'
                 )),
  url          text not null check (char_length(btrim(url)) between 4 and 2048),
  label        text,
  created_by   text not null check (char_length(btrim(created_by)) between 1 and 60),
  author_token uuid not null,
  created_at   timestamptz not null default now()
);

create index if not exists workstation_socials_subject_idx
  on public.workstation_socials (subject_id, created_at desc);

alter table public.workstation_socials enable row level security;

drop policy if exists "Workstation socials are readable by the team" on public.workstation_socials;
create policy "Workstation socials are readable by the team"
  on public.workstation_socials for select to anon, authenticated using (true);

drop policy if exists "Named team members can add socials" on public.workstation_socials;
create policy "Named team members can add socials"
  on public.workstation_socials for insert to anon, authenticated
  with check (public.workstation_author_token() is not null);

drop policy if exists "Authors can update their own socials" on public.workstation_socials;
create policy "Authors can update their own socials"
  on public.workstation_socials for update to anon, authenticated
  using (author_token = public.workstation_author_token())
  with check (author_token = public.workstation_author_token());

drop policy if exists "Authors can delete their own socials" on public.workstation_socials;
create policy "Authors can delete their own socials"
  on public.workstation_socials for delete to anon, authenticated
  using (
    author_token = public.workstation_author_token()
    or exists (select 1 from public.site_admins where user_id = auth.uid())
  );
