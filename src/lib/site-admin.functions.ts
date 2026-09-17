import { createServerFn } from "@tanstack/react-start";

const BUCKET = "site-assets";

function checkPasskey(passkey: string) {
  const expected = process.env["SITE_ADMIN_PASSKEY"] ?? "5309";
  if (passkey !== expected) throw new Error("Not authorized");
}

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export const uploadSiteAsset = createServerFn({ method: "POST" })
  .inputValidator((input: { passkey: string; name: string; contentType: string; data: string }) => input)
  .handler(async ({ data }) => {
    checkPasskey(data.passkey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const binary = Uint8Array.from(atob(data.data), (char) => char.charCodeAt(0));
    const id = crypto.randomUUID();
    const path = `${id}-${cleanFileName(data.name)}`;

    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, binary, {
      contentType: data.contentType || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    return { path };
  });

export const deleteSiteAsset = createServerFn({ method: "POST" })
  .inputValidator((input: { passkey: string; path: string }) => input)
  .handler(async ({ data }) => {
    checkPasskey(data.passkey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSiteSettings = createServerFn({ method: "POST" })
  .inputValidator((input: { passkey: string; content: unknown }) => input)
  .handler(async ({ data }) => {
    checkPasskey(data.passkey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert(
        { id: "main", content: data.content as never, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
