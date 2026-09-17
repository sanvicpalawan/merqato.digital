// Team Workstation data layer.
//
// Talks to Supabase (Postgres + the workstation-assets bucket) when the project
// is configured, and falls back to this browser's localStorage + IndexedDB when
// it isn't — so the panel is usable (and demoable) without a backend.

import { getAuthorName, getAuthorToken } from "./identity";
import { getWorkstationClient, isWorkstationCloudEnabled } from "./workstation-client";

// The board runs in the shared cloud project when it is configured (it always
// is on this project) and falls back to this browser otherwise.
const isSupabaseConfigured = isWorkstationCloudEnabled;

// Set when a cloud read fails (for example, before the workstation migration
// has been applied to the project). While it is set the board behaves like the
// local-only version so the panel stays usable, and reloading after the
// migration is applied puts everyone back on the shared board.
let cloudUnavailable = false;

export const WORKSTATION_BUCKET = "workstation-assets";
export const WORKSTATION_STORAGE_KEY = "merqato-team-workstation-v1";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ASSET_DB = "merqato-workstation-assets";
const ASSET_STORE = "files";
const LOCAL_PREFIX = "local:";

export type WorkstationPriority = "urgent" | "moderate" | "downtime";

export const PRIORITY_OPTIONS: {
  id: WorkstationPriority;
  label: string;
  short: string;
  hint: string;
}[] = [
  { id: "urgent", label: "Urgent", short: "Urgent", hint: "Needs eyes today" },
  { id: "moderate", label: "Moderate", short: "Moderate", hint: "Keep it moving this week" },
  {
    id: "downtime",
    label: "Check when you have downtime",
    short: "Downtime",
    hint: "Study material — no deadline",
  },
];

export const SUBJECT_CATEGORIES = ["Learning", "Project", "Tooling", "Client", "Process", "Other"];

export type WorkstationSubject = {
  id: string;
  title: string;
  summary: string;
  category: string;
  priority: WorkstationPriority;
  coverPath: string | null;
  createdBy: string;
  authorToken: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkstationEntry = {
  id: string;
  subjectId: string;
  kind: "comment" | "note";
  body: string;
  priority: WorkstationPriority | null;
  createdBy: string;
  authorToken: string;
  createdAt: string;
};

export type WorkstationLink = {
  id: string;
  subjectId: string;
  kind: "url" | "drive";
  url: string;
  label: string;
  createdBy: string;
  authorToken: string;
  createdAt: string;
};

export type WorkstationAttachment = {
  id: string;
  subjectId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdBy: string;
  authorToken: string;
  createdAt: string;
};

export type WorkstationSnapshot = {
  subjects: WorkstationSubject[];
  entries: WorkstationEntry[];
  links: WorkstationLink[];
  attachments: WorkstationAttachment[];
  /** Resolved <img> src per attachment storage path. */
  attachmentUrls: Record<string, string>;
  source: "cloud" | "local";
  /** Set when the shared board could not be read and this browser took over. */
  cloudError?: string;
};

const EMPTY: WorkstationSnapshot = {
  subjects: [],
  entries: [],
  links: [],
  attachments: [],
  attachmentUrls: {},
  source: "local",
};

/* ─────────────────────────── helpers ─────────────────────────── */

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

function cleanFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function assertImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" is not an image.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`"${file.name}" is larger than 10 MB.`);
}

function author() {
  const name = getAuthorName().trim();
  if (!name) throw new Error("Add your display name before posting.");
  return { name: name.slice(0, 60), token: getAuthorToken() };
}

export function canPost(): boolean {
  return getAuthorName().trim().length > 0;
}

function requireClient() {
  const client = getWorkstationClient();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

/** Cloud is usable once the project is configured and a read has not failed. */
function cloudReady(): boolean {
  return isSupabaseConfigured && !cloudUnavailable;
}

/* ───────────────────── local asset storage ───────────────────── */

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ASSET_STORE))
        request.result.createObjectStore(ASSET_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalAsset(file: File): Promise<string> {
  const db = await openAssetDb();
  const id = uuid();
  return new Promise<string>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readwrite");
    transaction.objectStore(ASSET_STORE).put({ id, file, name: file.name, type: file.type });
    transaction.oncomplete = () => {
      db.close();
      resolve(id);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

async function readLocalAssetUrl(id: string): Promise<string | undefined> {
  const db = await openAssetDb();
  return new Promise<string | undefined>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readonly");
    const request = transaction.objectStore(ASSET_STORE).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.file ? URL.createObjectURL(request.result.file as Blob) : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

async function dropLocalAsset(id: string): Promise<void> {
  const db = await openAssetDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readwrite");
    transaction.objectStore(ASSET_STORE).delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/* ───────────────────── local snapshot storage ───────────────────── */

function readLocal(): WorkstationSnapshot {
  try {
    const raw = localStorage.getItem(WORKSTATION_STORAGE_KEY);
    if (!raw) return { ...EMPTY, subjects: [], source: "local" };
    const parsed = JSON.parse(raw) as Partial<WorkstationSnapshot>;
    return {
      subjects: parsed.subjects ?? [],
      entries: parsed.entries ?? [],
      links: parsed.links ?? [],
      attachments: parsed.attachments ?? [],
      attachmentUrls: {},
      source: "local",
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeLocal(snapshot: WorkstationSnapshot) {
  localStorage.setItem(
    WORKSTATION_STORAGE_KEY,
    JSON.stringify({
      subjects: snapshot.subjects,
      entries: snapshot.entries,
      links: snapshot.links,
      attachments: snapshot.attachments,
    }),
  );
}

function mutateLocal(mutator: (snapshot: WorkstationSnapshot) => WorkstationSnapshot) {
  const next = mutator(readLocal());
  writeLocal(next);
  return next;
}

/* ───────────────────── row mapping ───────────────────── */

type Row = Record<string, unknown>;
const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const num = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0));

function mapSubject(row: Row): WorkstationSubject {
  return {
    id: str(row.id),
    title: str(row.title),
    summary: str(row.summary),
    category: str(row.category),
    priority: (str(row.priority, "moderate") as WorkstationPriority) ?? "moderate",
    coverPath: typeof row.cover_path === "string" ? row.cover_path : null,
    createdBy: str(row.created_by, "Unknown"),
    authorToken: str(row.author_token),
    createdAt: str(row.created_at, new Date().toISOString()),
    updatedAt: str(row.updated_at, str(row.created_at, new Date().toISOString())),
  };
}

function mapEntry(row: Row): WorkstationEntry {
  return {
    id: str(row.id),
    subjectId: str(row.subject_id),
    kind: str(row.kind, "comment") === "note" ? "note" : "comment",
    body: str(row.body),
    priority: typeof row.priority === "string" ? (row.priority as WorkstationPriority) : null,
    createdBy: str(row.created_by, "Unknown"),
    authorToken: str(row.author_token),
    createdAt: str(row.created_at, new Date().toISOString()),
  };
}

function mapLink(row: Row): WorkstationLink {
  return {
    id: str(row.id),
    subjectId: str(row.subject_id),
    kind: str(row.kind, "url") === "drive" ? "drive" : "url",
    url: str(row.url),
    label: str(row.label),
    createdBy: str(row.created_by, "Unknown"),
    authorToken: str(row.author_token),
    createdAt: str(row.created_at, new Date().toISOString()),
  };
}

function mapAttachment(row: Row): WorkstationAttachment {
  return {
    id: str(row.id),
    subjectId: str(row.subject_id),
    storagePath: str(row.storage_path),
    fileName: str(row.file_name, "image"),
    contentType: str(row.content_type, "image/*"),
    sizeBytes: num(row.size_bytes),
    createdBy: str(row.created_by, "Unknown"),
    authorToken: str(row.author_token),
    createdAt: str(row.created_at, new Date().toISOString()),
  };
}

function cloudUrl(path: string): string | undefined {
  const client = getWorkstationClient();
  if (!client) return undefined;
  try {
    return client.storage.from(WORKSTATION_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return undefined;
  }
}

/* ───────────────────── reads ───────────────────── */

async function loadLocalSnapshot(): Promise<WorkstationSnapshot> {
  const snapshot = readLocal();
  const urls: Record<string, string> = {};
  await Promise.all(
    snapshot.attachments.map(async (attachment) => {
      if (!attachment.storagePath.startsWith(LOCAL_PREFIX)) return;
      const url = await readLocalAssetUrl(attachment.storagePath.slice(LOCAL_PREFIX.length));
      if (url) urls[attachment.storagePath] = url;
    }),
  );
  return { ...snapshot, attachmentUrls: urls };
}

export async function loadWorkstation(): Promise<WorkstationSnapshot> {
  // Always re-attempt the shared board when the project is configured — that is
  // what makes the board heal itself once the migration has been applied.
  if (!isSupabaseConfigured) return loadLocalSnapshot();

  try {
    const client = requireClient();
    const [subjects, entries, links, attachments] = await Promise.all([
      client.from("workstation_subjects").select("*").order("created_at", { ascending: false }),
      client.from("workstation_entries").select("*").order("created_at", { ascending: true }),
      client.from("workstation_links").select("*").order("created_at", { ascending: false }),
      client.from("workstation_attachments").select("*").order("created_at", { ascending: false }),
    ]);

    for (const result of [subjects, entries, links, attachments]) {
      if (result.error) throw new Error(result.error.message);
    }

    const mappedAttachments = (attachments.data ?? []).map(mapAttachment);
    const urls: Record<string, string> = {};
    mappedAttachments.forEach((attachment) => {
      const url = cloudUrl(attachment.storagePath);
      if (url) urls[attachment.storagePath] = url;
    });

    cloudUnavailable = false;
    return {
      subjects: (subjects.data ?? []).map(mapSubject),
      entries: (entries.data ?? []).map(mapEntry),
      links: (links.data ?? []).map(mapLink),
      attachments: mappedAttachments,
      attachmentUrls: urls,
      source: "cloud",
    };
  } catch (error) {
    // The shared tables are not reachable (usually: the workstation migration
    // has not been applied yet). Keep the panel working against this browser
    // and tell the team what happened instead of showing an empty board.
    cloudUnavailable = true;
    const fallback = await loadLocalSnapshot();
    return {
      ...fallback,
      cloudError: error instanceof Error ? error.message : "The team cloud is not reachable.",
    };
  }
}

/* ───────────────────── writes ───────────────────── */

async function uploadImage(file: File): Promise<string> {
  assertImage(file);
  const { token } = author();
  const fileName = `${uuid()}-${cleanFileName(file.name)}`;

  if (!cloudReady()) return `${LOCAL_PREFIX}${await saveLocalAsset(file)}`;

  const path = `${token}/${fileName}`;
  const { error } = await requireClient()
    .storage.from(WORKSTATION_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return path;
}

export type NewSubjectInput = {
  title: string;
  summary: string;
  category: string;
  priority: WorkstationPriority;
  cover?: File | null;
};

export async function createSubject(input: NewSubjectInput): Promise<void> {
  const title = input.title.trim();
  if (!title) throw new Error("Give the subject a title.");
  const who = author();
  const coverPath = input.cover ? await uploadImage(input.cover) : null;
  const now = new Date().toISOString();
  const id = uuid();

  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      subjects: [
        {
          id,
          title,
          summary: input.summary.trim(),
          category: input.category,
          priority: input.priority,
          coverPath,
          createdBy: who.name,
          authorToken: who.token,
          createdAt: now,
          updatedAt: now,
        },
        ...snapshot.subjects,
      ],
    }));
    return;
  }

  const { error } = await requireClient()
    .from("workstation_subjects")
    .insert({
      id,
      title,
      summary: input.summary.trim() || null,
      category: input.category || null,
      priority: input.priority,
      cover_path: coverPath,
      created_by: who.name,
      author_token: who.token,
    });
  if (error) throw new Error(error.message);
}

export async function updateSubject(
  id: string,
  patch: Partial<
    Pick<WorkstationSubject, "title" | "summary" | "category" | "priority" | "coverPath">
  >,
): Promise<void> {
  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      subjects: snapshot.subjects.map((subject) =>
        subject.id === id ? { ...subject, ...patch, updatedAt: new Date().toISOString() } : subject,
      ),
    }));
    return;
  }

  const row: Row = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.summary !== undefined) row.summary = patch.summary || null;
  if (patch.category !== undefined) row.category = patch.category || null;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.coverPath !== undefined) row.cover_path = patch.coverPath;

  const { error } = await requireClient().from("workstation_subjects").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function replaceSubjectCover(id: string, file: File): Promise<void> {
  const path = await uploadImage(file);
  await updateSubject(id, { coverPath: path });
}

export async function deleteSubject(id: string): Promise<void> {
  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      subjects: snapshot.subjects.filter((subject) => subject.id !== id),
      entries: snapshot.entries.filter((entry) => entry.subjectId !== id),
      links: snapshot.links.filter((link) => link.subjectId !== id),
      attachments: snapshot.attachments.filter((attachment) => attachment.subjectId !== id),
    }));
    return;
  }
  const { error } = await requireClient().from("workstation_subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addEntry(input: {
  subjectId: string;
  kind: "comment" | "note";
  body: string;
  priority?: WorkstationPriority | null;
}): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new Error("Write something first.");
  const who = author();
  const id = uuid();
  const now = new Date().toISOString();

  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      entries: [
        ...snapshot.entries,
        {
          id,
          subjectId: input.subjectId,
          kind: input.kind,
          body,
          priority: input.kind === "note" ? (input.priority ?? "moderate") : null,
          createdBy: who.name,
          authorToken: who.token,
          createdAt: now,
        },
      ],
    }));
    return;
  }

  const { error } = await requireClient()
    .from("workstation_entries")
    .insert({
      id,
      subject_id: input.subjectId,
      kind: input.kind,
      body,
      priority: input.kind === "note" ? (input.priority ?? "moderate") : null,
      created_by: who.name,
      author_token: who.token,
    });
  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      entries: snapshot.entries.filter((entry) => entry.id !== id),
    }));
    return;
  }
  const { error } = await requireClient().from("workstation_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addLink(input: {
  subjectId: string;
  kind: "url" | "drive";
  url: string;
  label: string;
}): Promise<void> {
  const url = input.url.trim();
  if (!url) throw new Error("Paste a link first.");
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const who = author();
  const id = uuid();
  const now = new Date().toISOString();

  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      links: [
        ...snapshot.links,
        {
          id,
          subjectId: input.subjectId,
          kind: input.kind,
          url: withScheme,
          label: input.label.trim(),
          createdBy: who.name,
          authorToken: who.token,
          createdAt: now,
        },
      ],
    }));
    return;
  }

  const { error } = await requireClient()
    .from("workstation_links")
    .insert({
      id,
      subject_id: input.subjectId,
      kind: input.kind,
      url: withScheme,
      label: input.label.trim() || null,
      created_by: who.name,
      author_token: who.token,
    });
  if (error) throw new Error(error.message);
}

export async function deleteLink(id: string): Promise<void> {
  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      links: snapshot.links.filter((link) => link.id !== id),
    }));
    return;
  }
  const { error } = await requireClient().from("workstation_links").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addAttachments(subjectId: string, files: File[]): Promise<void> {
  const who = author();
  for (const file of files) {
    assertImage(file);
    const storagePath = await uploadImage(file);
    const id = uuid();
    const now = new Date().toISOString();

    if (!cloudReady()) {
      mutateLocal((snapshot) => ({
        ...snapshot,
        attachments: [
          ...snapshot.attachments,
          {
            id,
            subjectId,
            storagePath,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            createdBy: who.name,
            authorToken: who.token,
            createdAt: now,
          },
        ],
      }));
      continue;
    }

    const { error } = await requireClient().from("workstation_attachments").insert({
      id,
      subject_id: subjectId,
      storage_path: storagePath,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
      created_by: who.name,
      author_token: who.token,
    });
    if (error) throw new Error(error.message);
  }
}

export async function deleteAttachment(id: string, storagePath: string): Promise<void> {
  if (!cloudReady()) {
    mutateLocal((snapshot) => ({
      ...snapshot,
      attachments: snapshot.attachments.filter((attachment) => attachment.id !== id),
    }));
    if (storagePath.startsWith(LOCAL_PREFIX))
      await dropLocalAsset(storagePath.slice(LOCAL_PREFIX.length));
    return;
  }

  const client = requireClient();
  const { error } = await client.from("workstation_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // Best effort: the row is gone either way, so don't fail the UI on storage.
  await client.storage.from(WORKSTATION_BUCKET).remove([storagePath]);
}

/* ───────────────────── formatting helpers ───────────────────── */

const STAMP = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Manila",
});

export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${STAMP.format(date).replace(",", "")} PHT`;
}

export function formatRelative(iso: string): string {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "—";
  const seconds = Math.round((Date.now() - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatStamp(iso).replace(", PHT", "");
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function isDriveLink(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}
