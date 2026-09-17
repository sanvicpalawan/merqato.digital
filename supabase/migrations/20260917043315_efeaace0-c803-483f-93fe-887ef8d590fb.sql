drop policy if exists "Only site admins can create site settings" on public.site_settings;
create policy "Only site admins can create site settings"
on public.site_settings for insert
to authenticated
with check (exists (select 1 from public.site_admins where user_id = auth.uid()));

drop policy if exists "Only site admins can update site settings" on public.site_settings;
create policy "Only site admins can update site settings"
on public.site_settings for update
to authenticated
using (exists (select 1 from public.site_admins where user_id = auth.uid()))
with check (exists (select 1 from public.site_admins where user_id = auth.uid()));

drop policy if exists "Only site admins can delete site settings" on public.site_settings;
create policy "Only site admins can delete site settings"
on public.site_settings for delete
to authenticated
using (exists (select 1 from public.site_admins where user_id = auth.uid()));

drop policy if exists "Site admins can upload site assets" on storage.objects;
create policy "Site admins can upload site assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-assets' and exists (select 1 from public.site_admins where user_id = auth.uid()));

drop policy if exists "Site admins can update site assets" on storage.objects;
create policy "Site admins can update site assets"
on storage.objects for update
to authenticated
using (bucket_id = 'site-assets' and exists (select 1 from public.site_admins where user_id = auth.uid()))
with check (bucket_id = 'site-assets' and exists (select 1 from public.site_admins where user_id = auth.uid()));

drop policy if exists "Site admins can remove site assets" on storage.objects;
create policy "Site admins can remove site assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-assets' and exists (select 1 from public.site_admins where user_id = auth.uid()));

drop function if exists public.is_site_admin();