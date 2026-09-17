# Supabase Setup Hero

build and set up supabase. i already had the code tree and backend set up for supabase so implement the data base and storage accordingly.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cozy-cloud-setter.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/138bbecd-21b9-4893-a76c-00b946c56001).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Team Workstation

The hidden backoffice (triple-click the logo → passkey `5309`) has a **Team** tab: a shared study board
for the team. Subjects (_Learn GitHub_, _Learn Vercel_, _Project onboarding_, …) hold notes, comments,
web + Google Drive links and images uploaded from a device, each stamped with author and PHT time and
tagged **Urgent**, **Moderate** or **Check when you have downtime**.

The board pushes straight to Supabase with the publishable key — `x-author-token` identifies the author
for row level security — and falls back to this browser's `localStorage` + IndexedDB when the shared
board isn't reachable. Schema lives in `supabase/migrations/*_team_workstation.sql`.

See [`TEAM_WORKSTATION.md`](TEAM_WORKSTATION.md) for the full guide.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
