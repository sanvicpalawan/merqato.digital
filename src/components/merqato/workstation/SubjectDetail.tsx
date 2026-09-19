import { useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  HardDrive,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Send,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  isVideoAttachment,
  MAX_ENTRY_CHARS,
  parseUrlsBulk,
  type WorkstationAttachment,
  type WorkstationEntry,
  type WorkstationLink,
  type WorkstationPriority,
  type WorkstationSubject,
} from "@/lib/workstation";
import {
  Area,
  AuthorChip,
  EmptyHint,
  Field,
  IconButton,
  PriorityBadge,
  PriorityPicker,
  SectionCard,
  Stamp,
} from "./parts";

export default function SubjectDetail({
  subject,
  entries,
  links,
  attachments,
  attachmentUrls,
  myToken,
  busy,
  canPost,
  onBack,
  onPriority,
  onDeleteSubject,
  onCover,
  onUpdateSubject,
  onAddEntry,
  onDeleteEntry,
  onAddLink,
  onAddLinksBulk,
  onDeleteLink,
  onUpload,
  onDeleteAttachment,
}: {
  subject: WorkstationSubject;
  entries: WorkstationEntry[];
  links: WorkstationLink[];
  attachments: WorkstationAttachment[];
  attachmentUrls: Record<string, string>;
  myToken: string;
  busy: boolean;
  canPost: boolean;
  onBack: () => void;
  onPriority: (priority: WorkstationPriority) => Promise<void>;
  onDeleteSubject: () => Promise<void>;
  onCover: (file: File) => Promise<void>;
  onUpdateSubject: (patch: {
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
  }) => Promise<void>;
  onAddEntry: (
    kind: "comment" | "note",
    body: string,
    priority: WorkstationPriority,
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onAddLink: (kind: "url" | "drive", url: string, label: string) => Promise<void>;
  onAddLinksBulk: (kind: "url" | "drive", urls: string[], label: string) => Promise<void>;
  onDeleteLink: (id: string) => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  onDeleteAttachment: (attachment: WorkstationAttachment) => Promise<void>;
}) {
  const [noteBody, setNoteBody] = useState("");
  const [notePriority, setNotePriority] = useState<WorkstationPriority>("moderate");
  const [comment, setComment] = useState("");
  const [linkKind, setLinkKind] = useState<"url" | "drive">("url");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkDriveUrls, setBulkDriveUrls] = useState("");
  const [bulkLabel, setBulkLabel] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [copied, setCopied] = useState("");
  const coverInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const notes = entries
    .filter((entry) => entry.kind === "note")
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const comments = entries.filter((entry) => entry.kind === "comment");
  const driveLinks = links.filter((link) => link.kind === "drive");
  const webLinks = links.filter((link) => link.kind === "url");
  const coverUrl = subject.coverPath ? attachmentUrls[subject.coverPath] : undefined;
  const isOwner = subject.authorToken === myToken;
  const hasContact = Boolean(
    subject.contactName || subject.contactPhone || subject.contactEmail || subject.contactAddress,
  );

  const openContactEdit = () => {
    setCName(subject.contactName);
    setCPhone(subject.contactPhone);
    setCEmail(subject.contactEmail);
    setCAddress(subject.contactAddress);
    setEditingContact(true);
  };

  const saveContact = async () => {
    await onUpdateSubject({
      contactName: cName.trim(),
      contactPhone: cPhone.trim(),
      contactEmail: cEmail.trim(),
      contactAddress: cAddress.trim(),
    });
    setEditingContact(false);
  };

  const copy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  };

  const submitEntry = async (kind: "comment" | "note") => {
    const body = kind === "note" ? noteBody : comment;
    if (!body.trim()) return;
    await onAddEntry(kind, body, kind === "note" ? notePriority : "moderate");
    if (kind === "note") setNoteBody("");
    else setComment("");
  };

  const submitLink = async () => {
    if (!linkUrl.trim()) return;
    await onAddLink(linkKind, linkUrl, linkLabel);
    setLinkUrl("");
    setLinkLabel("");
  };

  const submitBulk = async (kind: "url" | "drive") => {
    const text = kind === "drive" ? bulkDriveUrls : bulkUrls;
    const urls = parseUrlsBulk(text);
    if (urls.length === 0) return;
    await onAddLinksBulk(kind, urls, bulkLabel);
    if (kind === "drive") setBulkDriveUrls("");
    else setBulkUrls("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <IconButton label="Back to all subjects" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30">
            {subject.category || "Subject"}
          </span>
          <h3 className="text-base font-bold brand-heading break-words leading-tight">
            {subject.title}
          </h3>
        </div>
        <PriorityBadge priority={subject.priority} className="mt-1" />
      </div>

      {subject.summary && (
        <p className="brand-copy text-xs leading-relaxed break-words whitespace-pre-wrap">
          {subject.summary}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5">
        <AuthorChip name={subject.createdBy} iso={subject.createdAt} />
        <span className="text-[11px] text-slate-400 dark:text-white/30">
          Updated <Stamp iso={subject.updatedAt} />
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PriorityPicker
          value={subject.priority}
          disabled={busy}
          onChange={(priority) => void onPriority(priority)}
        />
        <span className="ml-auto inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-500 dark:text-white/60 hover:border-slate-300 dark:hover:border-white/20 inline-flex items-center gap-1.5"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {coverUrl ? "Replace cover" : "Cover image"}
          </button>
          <input
            ref={coverInput}
            type="file"
            accept="image/*,video/*,.mov,.m4v,.avi,.mp4,.webm"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onCover(file);
              event.currentTarget.value = "";
            }}
          />
          {isOwner && (
            <IconButton
              label="Delete subject"
              tone="danger"
              disabled={busy}
              onClick={() => void onDeleteSubject()}
            >
              <Trash2 className="w-4 h-4" />
            </IconButton>
          )}
        </span>
      </div>

      {coverUrl &&
        (isVideoAttachment("", subject.coverPath ?? "") ? (
          <video
            src={coverUrl}
            controls
            preload="metadata"
            className="w-full h-36 object-cover rounded-2xl border border-slate-200 dark:border-white/10 bg-black"
          />
        ) : (
          <img
            src={coverUrl}
            alt={`${subject.title} cover`}
            className="w-full h-36 object-cover rounded-2xl border border-slate-200 dark:border-white/10"
          />
        ))}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-5">
        {/* ── Client contact ──────────────────────────────── */}
        {(hasContact || canPost) && (
          <div className="min-w-0 xl:col-start-2 xl:row-start-1">
            <SectionCard
              title="Client contact"
              icon={User}
              hint="Who to call and where to reach them. Tap to call or email — one click, no digging."
            >
              {editingContact ? (
                <div className="space-y-2">
                  <Field
                    label="Contact person"
                    value={cName}
                    onChange={setCName}
                    placeholder="Jaycee"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field label="Phone" value={cPhone} onChange={setCPhone} placeholder="+63 9…" />
                    <Field
                      label="Email"
                      value={cEmail}
                      onChange={setCEmail}
                      placeholder="client@example.com"
                    />
                  </div>
                  <Field
                    label="Address"
                    value={cAddress}
                    onChange={setCAddress}
                    placeholder="Street, town, island…"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveContact()}
                      className="btn-primary text-white px-4 py-2 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                    >
                      Save contact
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingContact(false)}
                      className="px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : hasContact ? (
                <ul className="space-y-1.5">
                  {subject.contactName && (
                    <li className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5">
                      <User className="w-4 h-4 brand-accent-text flex-shrink-0" />
                      <span className="text-xs font-semibold brand-heading flex-1 min-w-0 truncate">
                        {subject.contactName}
                      </span>
                      <IconButton
                        label="Copy contact name"
                        onClick={() => void copy(subject.contactName, "cname")}
                      >
                        {copied === "cname" ? (
                          <span className="text-[9px] font-bold">OK</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </IconButton>
                    </li>
                  )}
                  {subject.contactPhone && (
                    <li className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5">
                      <Phone className="w-4 h-4 brand-accent-text flex-shrink-0" />
                      <a
                        href={`tel:${subject.contactPhone.replace(/[^+\d]/g, "")}`}
                        className="text-xs font-semibold brand-heading flex-1 min-w-0 truncate hover:brand-accent-text"
                      >
                        {subject.contactPhone}
                      </a>
                      <IconButton
                        label="Copy phone"
                        onClick={() => void copy(subject.contactPhone, "cphone")}
                      >
                        {copied === "cphone" ? (
                          <span className="text-[9px] font-bold">OK</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </IconButton>
                    </li>
                  )}
                  {subject.contactEmail && (
                    <li className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5">
                      <Mail className="w-4 h-4 brand-accent-text flex-shrink-0" />
                      <a
                        href={`mailto:${subject.contactEmail}`}
                        className="text-xs font-semibold brand-heading flex-1 min-w-0 truncate hover:brand-accent-text"
                      >
                        {subject.contactEmail}
                      </a>
                      <IconButton
                        label="Copy email"
                        onClick={() => void copy(subject.contactEmail, "cemail")}
                      >
                        {copied === "cemail" ? (
                          <span className="text-[9px] font-bold">OK</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </IconButton>
                    </li>
                  )}
                  {subject.contactAddress && (
                    <li className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5">
                      <MapPin className="w-4 h-4 brand-accent-text flex-shrink-0" />
                      <span className="text-xs font-semibold brand-heading flex-1 min-w-0 break-words">
                        {subject.contactAddress}
                      </span>
                      <IconButton
                        label="Copy address"
                        onClick={() => void copy(subject.contactAddress, "caddr")}
                      >
                        {copied === "caddr" ? (
                          <span className="text-[9px] font-bold">OK</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </IconButton>
                    </li>
                  )}
                  {canPost && (
                    <button
                      type="button"
                      onClick={openContactEdit}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold brand-copy inline-flex items-center justify-center gap-1.5 hover:border-[var(--crimson)]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit contact
                    </button>
                  )}
                </ul>
              ) : (
                <button
                  type="button"
                  onClick={openContactEdit}
                  className="w-full px-3 py-3 rounded-xl border border-dashed border-slate-300 dark:border-white/15 text-xs brand-copy inline-flex items-center justify-center gap-2 hover:border-[var(--crimson)]"
                >
                  <User className="w-4 h-4 brand-accent-text" />
                  Add client contact — person, phone, email, address
                </button>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Notes ─────────────────────────────────────────── */}
        <div className="min-w-0 xl:col-start-1 xl:row-start-1 xl:row-span-3">
          <SectionCard
            title="Notes"
            icon={StickyNote}
            count={notes.length}
            hint="Full workstation notes — long-form reference material. 20,000 chars, multi-line, saved to the team cloud."
          >
            <div className="space-y-3">
              {canPost && (
                <div className="space-y-2">
                  <Area
                    label={`New note (${noteBody.length.toLocaleString()} / ${MAX_ENTRY_CHARS.toLocaleString()})`}
                    value={noteBody}
                    onChange={(value) => setNoteBody(value.slice(0, MAX_ENTRY_CHARS))}
                    rows={8}
                    placeholder="Write the full brief here — steps, context, decisions, follow-ups… (multi-line, big writing space)"
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <PriorityPicker value={notePriority} onChange={setNotePriority} />
                    <button
                      type="button"
                      disabled={busy || !noteBody.trim()}
                      onClick={() => void submitEntry("note")}
                      className="btn-primary text-white px-3.5 py-2 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                    >
                      Add note
                    </button>
                  </div>
                </div>
              )}
              {notes.length === 0 ? (
                <EmptyHint>No notes yet.</EmptyHint>
              ) : (
                <ul className="space-y-2.5">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <PriorityBadge priority={note.priority ?? "moderate"} />
                        {note.authorToken === myToken && (
                          <IconButton
                            label="Delete note"
                            tone="danger"
                            disabled={busy}
                            onClick={() => void onDeleteEntry(note.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>
                        )}
                      </div>
                      <p className="text-xs brand-heading leading-relaxed whitespace-pre-wrap break-words">
                        {note.body}
                      </p>
                      <div className="mt-2.5">
                        <AuthorChip name={note.createdBy} iso={note.createdAt} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Links ─────────────────────────────────────────── */}
        <div className="min-w-0 xl:col-start-2 xl:row-start-2">
          <SectionCard
            title="Reference links"
            icon={Link2}
            count={links.length}
            hint="Save one link or paste many at once. Web URLs and Google Drive URLs each get their own bulk box — all saved."
          >
            <div className="space-y-4">
              {canPost && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ["url", "Web link"],
                        ["drive", "Google Drive"],
                      ] as ["url" | "drive", string][]
                    ).map(([kind, label]) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setLinkKind(kind)}
                        className={cn(
                          "px-2.5 py-2 rounded-lg border text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all",
                          linkKind === kind
                            ? "border-[var(--crimson)] brand-accent-text bg-[var(--crimson-soft)]"
                            : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50",
                        )}
                      >
                        {kind === "drive" ? (
                          <HardDrive className="w-3.5 h-3.5" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                        {label}
                      </button>
                    ))}
                  </div>
                  <Field
                    label={linkKind === "drive" ? "Google Drive URL" : "URL"}
                    value={linkUrl}
                    onChange={setLinkUrl}
                    placeholder={
                      linkKind === "drive" ? "https://drive.google.com/..." : "https://..."
                    }
                  />
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <Field
                        label="Label (optional)"
                        value={linkLabel}
                        onChange={setLinkLabel}
                        placeholder="Deploy guide"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy || !linkUrl.trim()}
                      onClick={() => void submitLink()}
                      className="btn-primary text-white px-3.5 py-2.5 rounded-lg text-[11px] font-semibold disabled:opacity-50 flex-shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-3 space-y-2">
                    <Area
                      label={`Bulk web URLs (${parseUrlsBulk(bulkUrls).length} detected — one per line)`}
                      value={bulkUrls}
                      onChange={setBulkUrls}
                      rows={4}
                      placeholder={
                        "https://example.com/guide\nhttps://example.com/video\n…paste as many as needed"
                      }
                    />
                    <button
                      type="button"
                      disabled={busy || parseUrlsBulk(bulkUrls).length === 0}
                      onClick={() => void submitBulk("url")}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-semibold brand-heading hover:border-[var(--crimson)] disabled:opacity-50"
                    >
                      Save {parseUrlsBulk(bulkUrls).length} web link
                      {parseUrlsBulk(bulkUrls).length === 1 ? "" : "s"}
                    </button>
                  </div>
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-3 space-y-2">
                    <Area
                      label={`Bulk Google Drive URLs (${parseUrlsBulk(bulkDriveUrls).length} detected)`}
                      value={bulkDriveUrls}
                      onChange={setBulkDriveUrls}
                      rows={4}
                      placeholder={
                        "https://drive.google.com/file/d/...\nhttps://docs.google.com/document/d/...\n…paste as many Drive links as needed"
                      }
                    />
                    <div className="flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <Field
                          label="Label for all (optional)"
                          value={bulkLabel}
                          onChange={setBulkLabel}
                          placeholder="Sprint assets"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busy || parseUrlsBulk(bulkDriveUrls).length === 0}
                        onClick={() => void submitBulk("drive")}
                        className="px-3.5 py-2.5 rounded-lg btn-primary text-white text-[11px] font-semibold disabled:opacity-50 flex-shrink-0"
                      >
                        Save {parseUrlsBulk(bulkDriveUrls).length} Drive link
                        {parseUrlsBulk(bulkDriveUrls).length === 1 ? "" : "s"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {links.length === 0 ? (
                <EmptyHint>No links yet.</EmptyHint>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Google Drive", items: driveLinks, icon: HardDrive },
                    { label: "Web links", items: webLinks, icon: Link2 },
                  ].map(({ label, items, icon: Icon }) =>
                    items.length === 0 ? null : (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30 mb-1.5 inline-flex items-center gap-1.5">
                          <Icon className="w-3 h-3" />
                          {label}
                        </p>
                        <ul className="space-y-1.5">
                          {items.map((link) => (
                            <li
                              key={link.id}
                              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-2.5"
                            >
                              <div className="flex items-start gap-2">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="min-w-0 flex-1 group"
                                >
                                  <span className="text-xs font-semibold brand-heading break-all group-hover:brand-accent-text">
                                    {link.label || link.url}
                                  </span>
                                  {link.label && (
                                    <span className="block text-[11px] text-slate-400 dark:text-white/30 break-all mt-0.5">
                                      {link.url}
                                    </span>
                                  )}
                                </a>
                                <span className="flex items-center gap-0.5 flex-shrink-0">
                                  <IconButton
                                    label="Copy link"
                                    onClick={() => void copy(link.url, link.id)}
                                  >
                                    {copied === link.id ? (
                                      <span className="text-[9px] font-bold">OK</span>
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </IconButton>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    title="Open in new tab"
                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-slate-200/70 dark:hover:bg-white/10"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  {link.authorToken === myToken && (
                                    <IconButton
                                      label="Delete link"
                                      tone="danger"
                                      disabled={busy}
                                      onClick={() => void onDeleteLink(link.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </IconButton>
                                  )}
                                </span>
                              </div>
                              <div className="mt-1.5">
                                <AuthorChip name={link.createdBy} iso={link.createdAt} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Images & video ──────────────────────────────── */}
        <div className="min-w-0 xl:col-start-2 xl:row-start-3">
          <SectionCard
            title="Images & video from device"
            icon={ImagePlus}
            count={attachments.length}
            hint="Multiple images + video from this device. Images up to 10 MB, video up to 100 MB — all saved to the team cloud."
          >
            <div className="space-y-3">
              {canPost && (
                <>
                  <button
                    type="button"
                    onClick={() => imageInput.current?.click()}
                    className="asset-dropzone w-full rounded-xl px-3 py-5 text-xs brand-copy inline-flex items-center justify-center gap-2"
                  >
                    <ImagePlus className="w-4 h-4 brand-accent-text" />
                    Choose images / videos to upload (multiple)
                  </button>
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/*,video/*,.mov,.m4v,.avi,.mp4,.webm"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      if (files.length) void onUpload(files);
                      event.currentTarget.value = "";
                    }}
                  />
                </>
              )}
              {attachments.length === 0 ? (
                <EmptyHint>No images or videos uploaded yet.</EmptyHint>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {attachments.map((attachment) => {
                    const url = attachmentUrls[attachment.storagePath];
                    const isVideo = isVideoAttachment(attachment.contentType, attachment.fileName);
                    return (
                      <figure
                        key={attachment.id}
                        className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-white/[0.03]"
                      >
                        {url ? (
                          isVideo ? (
                            <video
                              src={url}
                              controls
                              preload="metadata"
                              className="w-full h-36 object-cover bg-black"
                            />
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer noopener">
                              <img
                                src={url}
                                alt={attachment.fileName}
                                className="w-full h-28 object-cover"
                              />
                            </a>
                          )
                        ) : (
                          <div className="w-full h-28 flex items-center justify-center text-[11px] brand-copy">
                            Preview unavailable
                          </div>
                        )}
                        <figcaption className="p-2">
                          <p
                            className="text-[11px] font-semibold brand-heading truncate"
                            title={attachment.fileName}
                          >
                            {isVideo ? "🎬 " : ""}
                            {attachment.fileName}
                          </p>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400 dark:text-white/30">
                              {attachment.createdBy}
                              {attachment.sizeBytes
                                ? ` · ${formatBytes(attachment.sizeBytes)}`
                                : ""}
                            </span>
                            {attachment.authorToken === myToken && (
                              <IconButton
                                label={isVideo ? "Delete video" : "Delete image"}
                                tone="danger"
                                disabled={busy}
                                onClick={() => void onDeleteAttachment(attachment)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </IconButton>
                            )}
                          </div>
                          <Stamp iso={attachment.createdAt} className="mt-1" />
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Discussion ────────────────────────────────────── */}
        <div className="min-w-0 xl:col-span-2">
          <SectionCard title="Discussion" icon={MessageSquare} count={comments.length}>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <EmptyHint>Nobody has commented yet.</EmptyHint>
              ) : (
                <ul className="space-y-2.5">
                  {comments.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3"
                    >
                      <p className="text-xs brand-heading leading-relaxed whitespace-pre-wrap break-words">
                        {entry.body}
                      </p>
                      <div className="mt-2.5">
                        <AuthorChip
                          name={entry.createdBy}
                          iso={entry.createdAt}
                          action={
                            entry.authorToken === myToken ? (
                              <IconButton
                                label="Delete comment"
                                tone="danger"
                                disabled={busy}
                                onClick={() => void onDeleteEntry(entry.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </IconButton>
                            ) : undefined
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canPost && (
                <div className="space-y-2">
                  <Area
                    label={`Add a comment (${comment.length.toLocaleString()} / ${MAX_ENTRY_CHARS.toLocaleString()})`}
                    value={comment}
                    onChange={(value) => setComment(value.slice(0, MAX_ENTRY_CHARS))}
                    rows={4}
                    placeholder="Ask a question or leave an update… (multi-line, all saved)"
                  />
                  <button
                    type="button"
                    disabled={busy || !comment.trim()}
                    onClick={() => void submitEntry("comment")}
                    className="btn-primary text-white px-3.5 py-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post comment
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
