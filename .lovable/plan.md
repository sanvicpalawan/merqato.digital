# merQato.digital landing page + Cloud backend

Bring the uploaded landing page into this project and set up its database and file storage.

## What you'll get

- The full merQato landing page (hero, about, pillars, packages, process, FAQ, footer, light/dark, languages) as the home page.
- The hidden backoffice unchanged: triple-click the logo, enter passkey 5309, edit everything. Edits keep saving in the browser as they do today.
- Cloud storage set up behind it: one settings record that holds the whole site configuration, plus a media bucket for logos, images and video (50 MB per file).
- The public page reads the published settings from the cloud when they exist, and falls back to the local version otherwise — so nothing breaks while we build.

## Publishing to the cloud

Publishing edits to the cloud and uploading media are locked to an authorised admin account for security. Since you don't want email sign-in yet, that stays switched off: the passkey backoffice works locally, and the cloud side is created and ready. When you want live publishing, say so and I'll add the admin login in one step.

## Technical notes

- Enable Lovable Cloud, then apply one migration mirroring `supabase/schema.sql`:
  - `public.site_settings` (id text 'main', content jsonb, updated_at) seeded with `{}`.
  - `public.site_admins` (user_id uuid references auth.users) as the admin allow-list.
  - `public.is_site_admin()` security-definer function; explicit GRANTs for `anon`/`authenticated`/`service_role` on both tables per policy scope.
  - RLS: public SELECT on `site_settings`; insert/update/delete gated by `is_site_admin()`.
  - Public `site-assets` storage bucket with mime + size limits and the four storage policies from the schema.
- Port `src/App.tsx` (~2700 lines) and `src/index.css` into this TanStack Start app:
  - Page code moves to `src/components/merqato/` and renders from `src/routes/index.tsx` (replacing the placeholder).
  - Browser-only bits (localStorage theme/lang/settings) read inside effects to avoid hydration mismatch.
  - Merge the uploaded theme tokens/fonts into `src/styles.css`; load Inter/JetBrains Mono via a `<link>` in `__root.tsx`.
  - `src/lib/supabase.ts` helpers rewritten against the generated `@/integrations/supabase/client`; cloud reads use the publishable client, writes stay behind auth.
  - Add `lucide-react` if missing; drop `vite-plugin-singlefile` usage.
- Route `head()` on `/` gets a merQato-specific title, description and og/twitter tags.
