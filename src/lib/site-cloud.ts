import { supabase } from "@/integrations/supabase/client";
import { deleteSiteAsset, saveSiteSettings, uploadSiteAsset } from "@/lib/site-admin.functions";

// The backoffice is unlocked with a passkey (not an email account), so admin
// writes go through server functions that verify that passkey.
let adminPasskey = "";
export function setAdminPasskey(value: string) {
  adminPasskey = value;
}

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
  if (!adminPasskey) return false;
  await saveSiteSettings({ data: { passkey: adminPasskey, content: settings } });
  return true;
}

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadCloudAsset(file: File) {
  if (!adminPasskey) throw new Error("Enter the backoffice passkey again before uploading.");
  const { path } = await uploadSiteAsset({
    data: {
      passkey: adminPasskey,
      name: file.name,
      contentType: file.type,
      data: await fileToBase64(file),
    },
  });
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
  if (!reference.startsWith(SITE_ASSET_PREFIX) || !adminPasskey) return;
  await deleteSiteAsset({
    data: { passkey: adminPasskey, path: reference.slice(SITE_ASSET_PREFIX.length) },
  });
}
