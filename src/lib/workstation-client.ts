// Direct-to-Supabase client for the Team Workstation.
//
// The rest of the backoffice saves through passkey-gated server functions
// (`@/lib/site-admin.functions`) because only the site owner holds the passkey.
// The workstation is different: it is a shared team board that *any* teammate
// inside the backoffice may post to, so it pushes straight to Supabase from the
// browser with the publishable key and lets row level security — created by
// `supabase/migrations/*_team_workstation.sql` — decide what is allowed.
//
// Those policies identify a teammate through the per-browser author token that
// Supabase reads from the `x-author-token` request header (see
// `public.workstation_author_token()`). The header therefore has to ride on
// every request the board makes: reads, posts, image uploads and image deletes.
// That is why the workstation owns this small client instead of reusing the
// generated one in `@/integrations/supabase/client` (which has no way to set a
// per-request header on storage calls).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getAuthorToken } from "./identity";

export const AUTHOR_TOKEN_HEADER = "x-author-token";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// Mirrors the transport rules of the generated client: new-style publishable
// keys travel as the `apikey` header and must never be sent as a bearer token,
// and the author token is attached to every single request.
function createWorkstationFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    headers.set(AUTHOR_TOKEN_HEADER, getAuthorToken());
    return fetch(input, { ...init, headers });
  };
}

/** True when the Supabase project variables are present, so the board is shared. */
export const isWorkstationCloudEnabled = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

let workstationClient: SupabaseClient | null = null;

/**
 * The workstation's own Supabase client (or `null` when the project is not
 * configured, in which case the board keeps everything in this browser).
 */
export function getWorkstationClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  if (!workstationClient) {
    workstationClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: createWorkstationFetch(SUPABASE_PUBLISHABLE_KEY) },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return workstationClient;
}
