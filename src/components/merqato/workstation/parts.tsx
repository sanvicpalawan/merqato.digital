import type { ChangeEvent, ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_OPTIONS,
  formatRelative,
  formatStamp,
  initials,
  type WorkstationPriority,
} from "@/lib/workstation";

export const priorityRank: Record<WorkstationPriority, number> = {
  urgent: 0,
  moderate: 1,
  downtime: 2,
};

export function priorityMeta(priority: WorkstationPriority) {
  return PRIORITY_OPTIONS.find((option) => option.id === priority) ?? PRIORITY_OPTIONS[1];
}

export const PRIORITY_TONE: Record<WorkstationPriority, string> = {
  urgent: "border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  moderate: "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  downtime: "border-sky-500/35 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: WorkstationPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap lg:text-[11px] lg:px-3 lg:py-1.5",
        PRIORITY_TONE[priority],
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {priorityMeta(priority).short}
    </span>
  );
}

export function PriorityPicker({
  value,
  onChange,
  disabled,
}: {
  value: WorkstationPriority;
  onChange: (priority: WorkstationPriority) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRIORITY_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          title={option.hint}
          onClick={() => onChange(option.id)}
          className={cn(
            "px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-50",
            value === option.id
              ? cn(PRIORITY_TONE[option.id], "border-current/40")
              : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20",
          )}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}

export function Stamp({ iso, className }: { iso: string; className?: string }) {
  return (
    <span
      title={`${formatStamp(iso)}`}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/40 whitespace-nowrap lg:text-xs",
        className,
      )}
    >
      <Clock3 className="w-3 h-3 flex-shrink-0" />
      {formatRelative(iso)}
    </span>
  );
}

export function AuthorChip({
  name,
  iso,
  action,
}: {
  name: string;
  iso: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-6 h-6 rounded-full brand-accent-soft brand-accent-text text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {initials(name)}
      </span>
      <span className="text-xs font-semibold brand-heading truncate lg:text-sm">{name}</span>
      <Stamp iso={iso} />
      {action && <span className="ml-auto flex-shrink-0">{action}</span>}
    </div>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  count,
  hint,
  children,
}: {
  title: string;
  icon: typeof Clock3;
  count?: number;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03] p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-3 lg:mb-4">
        <Icon className="w-4 h-4 brand-accent-text flex-shrink-0 lg:w-5 lg:h-5" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] brand-heading lg:text-sm">
          {title}
        </h4>
        {typeof count === "number" && (
          <span className="ml-auto text-[11px] font-semibold text-slate-400 dark:text-white/30">
            {count}
          </span>
        )}
      </div>
      {hint && (
        <p className="brand-copy text-[11px] leading-relaxed mb-3 lg:text-sm lg:mb-4">{hint}</p>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input
        className="admin-input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
      {hint && (
        <span className="block mt-1.5 text-[11px] text-slate-500 dark:text-white/40">{hint}</span>
      )}
    </label>
  );
}

export function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <textarea
        className="admin-textarea"
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        style={rows <= 2 ? { minHeight: "3.5rem" } : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <select
        className="admin-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Notice({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-xl border px-3 py-2.5 text-xs font-medium break-words",
        tone === "error"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
      )}
    >
      {children}
    </p>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-3 py-4 text-center text-xs brand-copy">
      {children}
    </p>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  tone = "muted",
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "muted" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors disabled:opacity-40",
        tone === "danger"
          ? "text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
          : "text-slate-500 dark:text-white/50 hover:bg-slate-200/70 dark:hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
