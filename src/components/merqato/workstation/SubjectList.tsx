import { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  FolderOpen,
  HardDrive,
  ImagePlus,
  Link2,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_OPTIONS,
  SUBJECT_CATEGORIES,
  type NewSubjectInput,
  type WorkstationAttachment,
  type WorkstationEntry,
  type WorkstationLink,
  type WorkstationPriority,
  type WorkstationSubject,
} from "@/lib/workstation";
import {
  Area,
  Field,
  Notice,
  PriorityBadge,
  PriorityPicker,
  SectionCard,
  Select,
  Stamp,
  priorityRank,
} from "./parts";

type Counts = { comments: number; notes: number; links: number; drive: number; images: number };

const STARTERS = [
  {
    title: "Learn GitHub",
    category: "Learning",
    priority: "downtime" as WorkstationPriority,
    summary: "Repos, branches, pull requests and how we review each other code.",
  },
  {
    title: "Learn Vercel",
    category: "Tooling",
    priority: "downtime" as WorkstationPriority,
    summary: "Deploy previews, environment variables, domains and rollbacks.",
  },
  {
    title: "Project onboarding",
    category: "Project",
    priority: "moderate" as WorkstationPriority,
    summary: "Everything a teammate needs before touching a client project.",
  },
];

export default function SubjectList({
  subjects,
  entries,
  links,
  attachments,
  busy,
  canPost,
  onOpen,
  onCreate,
}: {
  subjects: WorkstationSubject[];
  entries: WorkstationEntry[];
  links: WorkstationLink[];
  attachments: WorkstationAttachment[];
  busy: boolean;
  canPost: boolean;
  onOpen: (id: string) => void;
  onCreate: (input: NewSubjectInput) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | WorkstationPriority>("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState(SUBJECT_CATEGORIES[0]);
  const [priority, setPriority] = useState<WorkstationPriority>("moderate");
  const [cover, setCover] = useState<File | null>(null);
  const [localError, setLocalError] = useState("");
  const coverInput = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const map: Record<string, Counts> = {};
    subjects.forEach((subject) => {
      map[subject.id] = { comments: 0, notes: 0, links: 0, drive: 0, images: 0 };
    });
    entries.forEach((entry) => {
      const bucket = map[entry.subjectId];
      if (!bucket) return;
      if (entry.kind === "note") bucket.notes += 1;
      else bucket.comments += 1;
    });
    links.forEach((link) => {
      const bucket = map[link.subjectId];
      if (!bucket) return;
      if (link.kind === "drive") bucket.drive += 1;
      else bucket.links += 1;
    });
    attachments.forEach((attachment) => {
      const bucket = map[attachment.subjectId];
      if (bucket) bucket.images += 1;
    });
    return map;
  }, [subjects, entries, links, attachments]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subjects
      .filter((subject) => filter === "all" || subject.priority === filter)
      .filter(
        (subject) =>
          !needle ||
          subject.title.toLowerCase().includes(needle) ||
          subject.summary.toLowerCase().includes(needle) ||
          subject.category.toLowerCase().includes(needle),
      )
      .slice()
      .sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [subjects, filter, query]);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setCategory(SUBJECT_CATEGORIES[0]);
    setPriority("moderate");
    setCover(null);
    setLocalError("");
  };

  const submit = async () => {
    if (!title.trim()) {
      setLocalError("Give the subject a title.");
      return;
    }
    setLocalError("");
    await onCreate({ title, summary, category, priority, cover });
    resetForm();
    setShowForm(false);
  };

  const startFrom = (starter: (typeof STARTERS)[number]) => {
    setTitle(starter.title);
    setSummary(starter.summary);
    setCategory(starter.category);
    setPriority(starter.priority);
    setShowForm(true);
  };

  const tally = (subject: WorkstationSubject) =>
    counts[subject.id] ?? { comments: 0, notes: 0, links: 0, drive: 0, images: 0 };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="admin-input pl-9"
            placeholder="Search subjects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setLocalError("");
          }}
          className="btn-primary text-white px-3 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 flex-shrink-0"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Close" : "New"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          ["all", ...PRIORITY_OPTIONS.map((option) => option.id)] as ("all" | WorkstationPriority)[]
        ).map((id) => {
          const label =
            id === "all"
              ? "All subjects"
              : PRIORITY_OPTIONS.find((option) => option.id === id)!.short;
          const total =
            id === "all"
              ? subjects.length
              : subjects.filter((subject) => subject.priority === id).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all",
                filter === id
                  ? "bg-[var(--crimson)] border-transparent text-white"
                  : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20",
              )}
            >
              {label} <span className="opacity-60">{total}</span>
            </button>
          );
        })}
      </div>

      {showForm && (
        <SectionCard title="New subject" icon={FolderOpen}>
          <div className="space-y-3">
            <Field
              label="Subject title"
              value={title}
              onChange={setTitle}
              placeholder="Learn GitHub"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Category"
                value={category}
                onChange={setCategory}
                options={SUBJECT_CATEGORIES.map((option) => ({ value: option, label: option }))}
              />
              <div>
                <span className="admin-label">Priority</span>
                <PriorityPicker value={priority} onChange={setPriority} />
              </div>
            </div>
            <Area
              label="What is this about?"
              value={summary}
              onChange={setSummary}
              rows={3}
              placeholder="What the team should know or learn from this subject."
            />
            <div>
              <span className="admin-label">Cover image or video (optional)</span>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="asset-dropzone w-full rounded-xl px-3 py-4 text-xs brand-copy inline-flex items-center justify-center gap-2"
              >
                <ImagePlus className="w-4 h-4 brand-accent-text" />
                {cover ? cover.name : "Upload an image or video from this device"}
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/*,video/*,.mov,.m4v,.avi,.mp4,.webm"
                className="hidden"
                onChange={(event) => {
                  setCover(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            {localError && <Notice>{localError}</Notice>}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={busy || !canPost}
                onClick={() => void submit()}
                className="btn-primary text-white px-4 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {busy ? "Saving…" : "Create subject"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {!canPost && (
        <Notice tone="info">
          Add your display name above to post subjects, comments, links and images.
        </Notice>
      )}

      {visible.length === 0 ? (
        <div className="space-y-3">
          <p className="brand-copy text-xs leading-relaxed">
            {subjects.length === 0
              ? "No subjects yet. Start the library with one of these, or create your own."
              : "Nothing matches that filter."}
          </p>
          {subjects.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((starter) => (
                <button
                  key={starter.title}
                  type="button"
                  onClick={() => startFrom(starter)}
                  className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-white/15 text-[11px] font-semibold brand-copy inline-flex items-center gap-1.5 hover:border-[var(--crimson)]"
                >
                  <Sparkles className="w-3.5 h-3.5 brand-accent-text" />
                  {starter.title}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((subject) => {
            const stat = tally(subject);
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => onOpen(subject.id)}
                className="w-full text-left rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 transition-all hover:border-[var(--crimson)] hover:shadow-sm group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <PriorityBadge priority={subject.priority} />
                      {subject.category && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-white/30">
                          {subject.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold brand-heading truncate">{subject.title}</h3>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:brand-accent-text flex-shrink-0 mt-1" />
                </div>

                {subject.summary && (
                  <p className="brand-copy text-xs leading-relaxed mt-2 line-clamp-2">
                    {subject.summary}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 flex-wrap text-[11px] text-slate-500 dark:text-white/40">
                  <span className="inline-flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5" />
                    {stat.notes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {stat.comments}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    {stat.links}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    {stat.drive}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ImagePlus className="w-3.5 h-3.5" />
                    {stat.images}
                  </span>
                  <Stamp iso={subject.updatedAt} className="ml-auto" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-white/25 inline-flex items-center gap-1.5">
        <ChevronDown className="w-3 h-3" />
        Urgent subjects float to the top.
      </p>
    </div>
  );
}
