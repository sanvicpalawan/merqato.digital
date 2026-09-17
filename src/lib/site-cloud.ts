import { supabase } from "@/integrations/supabase/client";

export const SITE_SETTINGS_TABLE = "site_settings";
export const SITE_ASSET_BUCKET = "site-assets";
export const SITE_ASSET_PREFIX = "remote:";

// The generated client is always configured on this project.
export const isSupabaseConfigured = true;
export { supabase };

export async function loadCloudSettings<T>() {
  const { data, error } = await supabase
    .from(SITE_SETTINGS_TABLE)
    .select("content")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw error;
  const content = data?.content as T | undefined;
  if (!content || (typeof content === "object" && Object.keys(content as object).length === 0)) {
    return null;
  }
  return content;
}

export async function persistCloudSettings<T>(settings: T) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;

  const { error } = await supabase.from(SITE_SETTINGS_TABLE).upsert(
    {
      id: "main",
      content: settings as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
  return true;
}

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export async function uploadCloudAsset(file: File) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${id}-${cleanFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(SITE_ASSET_BUCKET)
    .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });

  if (error) throw error;
  return `${SITE_ASSET_PREFIX}${path}`;
}

// The media bucket is private, so files are served through the app's own
// asset endpoint instead of a direct storage URL.
export function getCloudAssetUrl(reference: string) {
  if (!reference.startsWith(SITE_ASSET_PREFIX)) return undefined;
  const path = reference.slice(SITE_ASSET_PREFIX.length);
  return `/api/public/site-assets/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export async function removeCloudAsset(reference: string) {
  if (!reference.startsWith(SITE_ASSET_PREFIX)) return;
  const { error } = await supabase.storage
    .from(SITE_ASSET_BUCKET)
    .remove([reference.slice(SITE_ASSET_PREFIX.length)]);
  if (error) throw error;
}
