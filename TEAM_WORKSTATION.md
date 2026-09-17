# Team Workstation

A shared study board inside the backoffice (triple-click the logo → passkey `5309` → **Team** tab) where
the team opens subjects — _Learn GitHub_, _Learn Vercel_, _Project onboarding_, anything — and posts
notes, comments, links, Google Drive links and images against them. Everything is stamped with **who**
posted it and **when**, in PHT.

---

## What's in it

**Subject library**

- Create a subject with a title, category (`Learning`, `Project`, `Tooling`, `Client`, `Process`, `Other`),
  a short "what is this about" summary, an optional cover image, and a priority.
- Urgent subjects float to the top; filter by priority or search by title/summary/category.
- Starter chips (**Learn GitHub**, **Learn Vercel**, **Project onboarding**) prefill the form the first time.

**Priority on every subject**

| Priority                         | Meaning                     |
| -------------------------------- | --------------------------- |
| **Urgent**                       | Needs eyes today            |
| **Moderate**                     | Keep it moving this week    |
| **Check when you have downtime** | Study material, no deadline |

Priority can be changed at any time by anyone; notes carry their own priority too.

**Inside a subject**

- **Notes** — reference material, each with its own priority tag.
- **Reference links** — plain URLs _and_ Google Drive URLs, optionally labelled. Open in a new tab or copy.
- **Images from device** — up to 10 MB each, multiple at once, shown as a thumbnail grid.
- **Discussion** — a running comment thread, oldest → newest.

Every note, link, image and comment shows the author's initials + name and a timestamp
(e.g. `2h ago`, hover for the exact `17 Sep 2026 14:32 PHT`).

---

## How identity works (no login)

There is no sign-in. A teammate types a **display name** once at the top of the panel; it is saved in that
browser and stamped on everything they post.

Alongside the name, the browser mints a random **author token** (`src/lib/identity.ts`) and sends it to
Supabase as the `x-author-token` request header. That token is what lets someone delete _their own_ note,
link, image or subject — the delete button only appears on your own posts. It is not a security boundary
(see below), just enough to stop people deleting each other's work by accident.

---

## How it talks to Supabase

Unlike the rest of the backoffice — which saves through passkey-gated server functions
(`src/lib/site-admin.functions.ts`) because only the owner holds the passkey — the workstation pushes
**directly** to Supabase from the browser:

| Piece                                        | Role                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/workstation-client.ts`              | Its own Supabase client (publishable key) whose fetch attaches `apikey` + `x-author-token` to **every** request, including Storage uploads and deletes. |
| `src/lib/workstation.ts`                     | Data layer: cloud reads/writes plus the local-only fallback.                                                                                            |
| `supabase/migrations/*_team_workstation.sql` | Tables, RLS policies, the `workstation_author_token()` helper and the `workstation-assets` bucket.                                                      |
| `src/components/merqato/workstation/*`       | The panel itself (`TeamWorkstation`, `SubjectList`, `SubjectDetail`, `parts`).                                                                          |

### Applying the schema

The migration ships with the repo and is applied to the project like the other migrations. To do it by
hand, paste `supabase/migrations/20260917050000_team_workstation.sql` into **Supabase Dashboard → SQL
Editor** and run it.

It creates:

- `public.workstation_subjects` — one row per study subject (title, summary, category, priority, cover
  image path, author, timestamps).
- `public.workstation_entries` — notes (`kind = 'note'`) and comments (`kind = 'comment'`).
- `public.workstation_links` — `kind = 'url'` or `'drive'`.
- `public.workstation_attachments` — uploaded images (storage path, file name, type, size).
- the **`workstation-assets`** storage bucket — public-read, 10 MB per image, image MIME types only.
- RLS policies plus `public.workstation_author_token()`, which reads the `x-author-token` header.

No new environment variables: it reuses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Access rules

| Action                                       | Who                                                         |
| -------------------------------------------- | ----------------------------------------------------------- |
| Read everything                              | anyone who reached the backoffice (`anon`, `authenticated`) |
| Post a subject, note, comment, link or image | anyone with a display name                                  |
| Change a subject's priority                  | anyone with a display name                                  |
| Delete a note / link / image                 | its author only                                             |
| Delete a subject                             | its author only                                             |

The panel shows a **Team cloud** badge when it is reading the shared board, and **This browser** when it
isn't. In cloud mode the board refreshes itself every 60 seconds so teammates see new posts without
reloading.

---

## Working without the cloud

If the project variables are missing, or the shared board cannot be read (for example, before the
migration above has been applied), the workstation falls back to this browser: subjects, notes, links and
comments live in `localStorage` (`merqato-team-workstation-v1`) and uploaded images live in IndexedDB
(`merqato-workstation-assets`). The panel stays usable and explains the fallback in a notice; reload once
the migration is in place and everyone is back on the shared board.

---

## Security note

The workstation is protected by the same backoffice passkey gesture as the rest of the admin panel, and
the `x-author-token` header is set by the browser — anyone who knows how to call your Supabase endpoint
directly could post or delete. It is a convenience layer for a small, trusted team, not production
authentication.

When you're ready to lock it down: enable Supabase Auth, then replace the `using (true)` read policies in
the migration with a `site_admins` check and the author checks with `auth.uid()`. The data model and UI
don't change.
