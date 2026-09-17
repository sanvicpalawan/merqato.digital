// Per-browser identity for the Team Workstation.
//
// The workstation deliberately has no login: a teammate types a display name
// once and everything they post is stamped with it. Alongside the name we mint
// a random token that travels to Supabase as the `x-author-token` header —
// it is what lets someone delete their own posts without being able to delete
// everyone else's.

const NAME_KEY = "merqato-workstation-name";
const TOKEN_KEY = "merqato-workstation-token";

function uuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Format-compatible fallback so the value still casts to uuid in Postgres.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getAuthorToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const token = uuidV4();
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return uuidV4();
  }
}

export function getAuthorName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAuthorName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 60));
  } catch {
    /* storage unavailable — the name just won't persist */
  }
}
