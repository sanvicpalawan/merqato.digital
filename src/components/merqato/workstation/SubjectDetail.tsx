import { useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  HardDrive,
  ImagePlus,
  Link2,
  MessageSquare,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBytes,
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
  onAddEntry,
  onDeleteEntry,
  onAddLink,
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
  onAddEntry: (
    kind: "comment" | "note",
    body: string,
    priority: WorkstationPriority,
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onAddLink: (kind: "url" | "drive", url: string, label: string) => Promise<void>;
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
            accept="image/*"
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

      {coverUrl && (
        <img
          src={coverUrl}
          alt={`${subject.title} cover`}
          className="w-full h-36 object-cover rounded-2xl border border-slate-200 dark:border-white/10"
        />
      )}

      {/* ── Notes ─────────────────────────────────────────── */}
      <SectionCard
        title="Notes"
        icon={StickyNote}
        count={notes.length}
        hint="Reference material for this subject. Tag it so the team knows how loudly it should ping them."
      >
        <div className="space-y-3">
          {canPost && (
            <div className="space-y-2">
              <Area
                label="New note"
                value={noteBody}
                onChange={setNoteBody}
                rows={3}
                placeholder="What should the team know?"
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

      {/* ── Links ─────────────────────────────────────────── */}
      <SectionCard
        title="Reference links"
        icon={Link2}
        count={links.length}
        hint="Drop plain URLs or Google Drive links. Label them so the team knows what they open."
      >
        <div className="space-y-3">
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
                placeholder={linkKind === "drive" ? "https://drive.google.com/..." : "https://..."}
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

      {/* ── Images ────────────────────────────────────────── */}
      <SectionCard
        title="Images from device"
        icon={ImagePlus}
        count={attachments.length}
        hint="Screenshots, diagrams and references. Up to 10 MB per image."
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
                Choose images to upload
              </button>
              <input
                ref={imageInput}
                type="file"
                accept="image/*"
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
            <EmptyHint>No images uploaded yet.</EmptyHint>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {attachments.map((attachment) => {
                const url = attachmentUrls[attachment.storagePath];
                return (
                  <figure
                    key={attachment.id}
                    className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-white/[0.03]"
                  >
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer noopener">
                        <img
                          src={url}
                          alt={attachment.fileName}
                          className="w-full h-28 object-cover"
                        />
                      </a>
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
                        {attachment.fileName}
                      </p>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-white/30">
                          {attachment.createdBy}
                          {attachment.sizeBytes ? ` · ${formatBytes(attachment.sizeBytes)}` : ""}
                        </span>
                        {attachment.authorToken === myToken && (
                          <IconButton
                            label="Delete image"
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

      {/* ── Discussion ────────────────────────────────────── */}
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
                label="Add a comment"
                value={comment}
                onChange={setComment}
                rows={2}
                placeholder="Ask a question or leave an update…"
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
  );
}
