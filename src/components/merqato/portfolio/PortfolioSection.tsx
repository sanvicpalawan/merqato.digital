import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  Globe,
  Layers,
  Play,
  Server,
  Sparkles,
  Triangle,
  X,
} from "lucide-react";
import { useResolvedAssets } from "@/lib/site-media";
import {
  PORTFOLIO_STATUS_LABEL,
  coverMedia,
  portfolioAssetIds,
  type PortfolioLink,
  type PortfolioProject,
  type PortfolioSettings,
  type PortfolioStatus,
} from "./portfolio-data";

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  font,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  font: string;
}) {
  return (
    <div className="max-w-3xl mb-12 sm:mb-16">
      <div className="inline-flex items-center gap-3 mb-4 sm:mb-6">
        <div className="h-px w-12 brand-accent-bg flex-shrink-0" />
        <span className="section-label">{eyebrow}</span>
      </div>
      <h2
        className="text-2xl sm:text-4xl lg:text-5xl font-bold brand-heading tracking-tight leading-tight break-words"
        style={{ fontFamily: font }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="brand-copy text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mt-4 sm:mt-6 break-words">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PortfolioStatus }) {
  const tone =
    status === "live"
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : status === "development"
        ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
        : status === "concept"
          ? "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10"
          : "text-slate-500 dark:text-white/50 border-slate-400/30 bg-slate-500/10";
  const dot =
    status === "live"
      ? "bg-emerald-500"
      : status === "development"
        ? "bg-amber-500"
        : status === "concept"
          ? "bg-sky-500"
          : "bg-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {PORTFOLIO_STATUS_LABEL[status]}
    </span>
  );
}

function LinkIcon({ kind, className = "w-4 h-4" }: { kind: PortfolioLink["kind"]; className?: string }) {
  if (kind === "github") return <Github className={className} />;
  if (kind === "vercel") return <Triangle className={className} />;
  if (kind === "backend") return <Server className={className} />;
  if (kind === "website") return <Globe className={className} />;
  if (kind === "design") return <Layers className={className} />;
  return <ExternalLink className={className} />;
}

function MediaFrame({
  src,
  type,
  alt,
  className = "",
  autoPlay = false,
}: {
  src?: string;
  type?: "image" | "video";
  alt: string;
  className?: string;
  autoPlay?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-white/[0.04] ${className}`}
      >
        <Sparkles className="w-6 h-6 brand-accent-text opacity-60" />
      </div>
    );
  }
  if (type === "video") {
    return (
      <video
        className={`hero-media w-full h-full object-cover ${className}`}
        src={src}
        muted
        loop
        playsInline
        autoPlay={autoPlay}
        controls={!autoPlay}
        aria-label={alt}
      />
    );
  }
  return <img className={`w-full h-full object-cover ${className}`} src={src} alt={alt} />;
}

function ProjectModal({
  project,
  assetUrls,
  accountName,
  font,
  onClose,
}: {
  project: PortfolioProject;
  assetUrls: Record<string, string>;
  accountName?: string;
  font: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => {
    const cover = coverMedia(project);
    const found = project.media.findIndex((media) => media.id === cover?.id);
    return found < 0 ? 0 : found;
  });
  const media = project.media[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && project.media.length > 1)
        setIndex((current) => (current + 1) % project.media.length);
      if (event.key === "ArrowLeft" && project.media.length > 1)
        setIndex((current) => (current - 1 + project.media.length) % project.media.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, project.media.length]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center overflow-y-auto p-0 sm:p-6">
      <button
        type="button"
        aria-label="Close project"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/70 dark:bg-black/80 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        className="relative z-10 w-full sm:max-w-5xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden my-0 sm:my-8"
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-8 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <StatusBadge status={project.status} />
              {project.year && (
                <span className="text-[11px] font-semibold brand-copy">{project.year}</span>
              )}
            </div>
            <h3
              className="text-lg sm:text-2xl font-bold brand-heading tracking-tight break-words"
              style={{ fontFamily: font }}
            >
              {project.title}
            </h3>
            <p className="text-xs sm:text-sm brand-copy mt-1 break-words">{project.tagline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
          <div className="border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10">
            <div className="relative bg-slate-950/[0.03] dark:bg-black/40 aspect-video w-full overflow-hidden">
              <MediaFrame
                src={media ? assetUrls[media.assetId] : undefined}
                type={media?.type}
                alt={media?.caption || project.title}
                className="absolute inset-0"
              />
              {project.media.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous media"
                    onClick={() =>
                      setIndex((current) => (current - 1 + project.media.length) % project.media.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#0B0F17]/90 border border-slate-200 dark:border-white/10 flex items-center justify-center brand-heading cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next media"
                    onClick={() => setIndex((current) => (current + 1) % project.media.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#0B0F17]/90 border border-slate-200 dark:border-white/10 flex items-center justify-center brand-heading cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {media?.caption && (
              <p className="px-5 sm:px-6 py-3 text-[11.5px] brand-copy break-words">{media.caption}</p>
            )}
            {project.media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-5 sm:px-6 pb-5">
                {project.media.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    aria-label={`View media ${itemIndex + 1}`}
                    className={`relative h-14 w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      itemIndex === index
                        ? "border-[var(--crimson)]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <MediaFrame
                      src={assetUrls[item.assetId]}
                      type={item.type === "video" ? "image" : "image"}
                      alt={item.caption || project.title}
                      className="absolute inset-0"
                    />
                    {item.type === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                        <Play className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 sm:px-7 py-6 space-y-6">
            <dl className="grid grid-cols-2 gap-4 text-[12px]">
              {project.client && (
                <div>
                  <dt className="section-label">Client</dt>
                  <dd className="brand-heading font-semibold mt-1 break-words">{project.client}</dd>
                </div>
              )}
              {accountName && (
                <div>
                  <dt className="section-label">Account</dt>
                  <dd className="brand-heading font-semibold mt-1 break-words">{accountName}</dd>
                </div>
              )}
            </dl>

            {project.tags.length > 0 && (
              <div>
                <span className="section-label">Stack</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold brand-copy"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {[
              ["Overview", project.summary],
              ["Challenge", project.challenge],
              ["Solution", project.solution],
              ["Impact", project.impact],
            ]
              .filter(([, body]) => Boolean(body))
              .map(([label, body]) => (
                <div key={label}>
                  <span className="section-label">{label}</span>
                  <p className="brand-copy text-[13px] leading-relaxed mt-1.5 whitespace-pre-line break-words">
                    {body}
                  </p>
                </div>
              ))}

            {project.links.length > 0 && (
              <div className="space-y-2">
                <span className="section-label">Links</span>
                <div className="grid gap-2">
                  {project.links
                    .filter((link) => link.url)
                    .map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn-secondary inline-flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold"
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <LinkIcon kind={link.kind} />
                          <span className="truncate">{link.label}</span>
                        </span>
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioSection({
  portfolio,
  headingFont,
}: {
  portfolio: PortfolioSettings;
  headingFont: string;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | PortfolioStatus>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | undefined>();
  const assetUrls = useResolvedAssets(portfolioAssetIds(portfolio));

  const published = useMemo(
    () => portfolio.items.filter((item) => item.published !== false),
    [portfolio.items],
  );
  const tags = useMemo(
    () => Array.from(new Set(published.flatMap((item) => item.tags))).slice(0, 14),
    [published],
  );

  const visible = published.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (tagFilter !== "all" && !item.tags.includes(tagFilter)) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return [item.title, item.tagline, item.client, ...item.tags]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const openProject = published.find((item) => item.id === openId);
  const account = openProject
    ? portfolio.accounts.find((item) => item.id === openProject.accountId)
    : undefined;

  if (published.length === 0) return null;

  return (
    <section id="portfolio" className="relative py-20 sm:py-24 lg:py-32 overflow-hidden max-w-full">
      <div className="absolute inset-0 grid-overlay opacity-40 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={portfolio.eyebrow}
          title={portfolio.title}
          subtitle={portfolio.subtitle}
          font={headingFont}
        />

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-8">
          <div className="flex flex-wrap gap-2">
            {(["all", "live", "development"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] transition-all cursor-pointer ${
                  statusFilter === value
                    ? "bg-[var(--crimson)] text-white"
                    : "bg-slate-100 dark:bg-white/5 brand-copy hover:bg-slate-200/70 dark:hover:bg-white/10"
                }`}
              >
                {value === "all" ? "All Work" : PORTFOLIO_STATUS_LABEL[value]}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col sm:flex-row gap-3 lg:justify-end">
            {tags.length > 0 && (
              <select
                className="admin-input sm:max-w-[220px]"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                aria-label="Filter by technology"
              >
                <option value="all">All technologies</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
            <input
              className="admin-input sm:max-w-[240px]"
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search projects"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((project) => {
            const cover = coverMedia(project);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setOpenId(project.id)}
                className="glass-card hover-lift group flex flex-col overflow-hidden rounded-2xl text-left cursor-pointer h-full"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
                  <MediaFrame
                    src={cover ? assetUrls[cover.assetId] : undefined}
                    type={cover?.type}
                    alt={project.title}
                    autoPlay={cover?.type === "video"}
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-3 top-3">
                    <StatusBadge status={project.status} />
                  </span>
                  {project.featured && (
                    <span className="absolute right-3 top-3 brand-accent-bg text-white rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3
                    className="text-base sm:text-lg font-bold brand-heading tracking-tight break-words"
                    style={{ fontFamily: headingFont }}
                  >
                    {project.title}
                  </h3>
                  <p className="text-[12px] brand-copy mt-1 break-words">{project.tagline}</p>
                  {project.summary && (
                    <p className="text-[12.5px] brand-copy leading-relaxed mt-3 line-clamp-3 break-words">
                      {project.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {project.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 dark:border-white/10 px-2 py-0.5 text-[10.5px] font-semibold brand-copy"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold brand-accent-text">
                    View case study
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {visible.length === 0 && (
          <p className="brand-copy text-sm">No projects match those filters yet.</p>
        )}
      </div>

      {openProject && (
        <ProjectModal
          project={openProject}
          assetUrls={assetUrls}
          accountName={account?.name}
          font={headingFont}
          onClose={() => setOpenId(undefined)}
        />
      )}
    </section>
  );
}
