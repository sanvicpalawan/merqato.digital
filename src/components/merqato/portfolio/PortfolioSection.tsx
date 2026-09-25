import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  Globe,
  ImageIcon,
  Layers,
  Play,
  Search,
  Server,
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

function StatusBadge({ status }: { status: PortfolioStatus }) {
  return (
    <span className={`portfolio-status portfolio-status-${status}`}>
      <span aria-hidden="true" />
      {PORTFOLIO_STATUS_LABEL[status]}
    </span>
  );
}

function LinkIcon({ kind, className = "size-4" }: { kind: PortfolioLink["kind"]; className?: string }) {
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
      <div className={`portfolio-media-empty ${className}`}>
        <ImageIcon className="size-7" />
        <span>Project media</span>
      </div>
    );
  }
  if (type === "video") {
    return (
      <video
        className={`hero-media size-full object-cover ${className}`}
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
  return <img className={`size-full object-cover ${className}`} src={src} alt={alt} />;
}

function ProjectModal({
  project,
  assetUrls,
  accountName,
  onClose,
}: {
  project: PortfolioProject;
  assetUrls: Record<string, string>;
  accountName?: string;
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
    <div className="portfolio-modal-shell">
      <button type="button" aria-label="Close project" onClick={onClose} className="portfolio-modal-backdrop" />
      <article role="dialog" aria-modal="true" aria-label={project.title} className="portfolio-modal">
        <button type="button" onClick={onClose} aria-label="Close" className="portfolio-modal-close">
          <X className="size-5" />
        </button>
        <div className="portfolio-modal-grid">
          <div className="portfolio-modal-gallery">
            <div className="portfolio-modal-stage">
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
                    onClick={() => setIndex((current) => (current - 1 + project.media.length) % project.media.length)}
                    className="portfolio-gallery-arrow left-3"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next media"
                    onClick={() => setIndex((current) => (current + 1) % project.media.length)}
                    className="portfolio-gallery-arrow right-3"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <div className="portfolio-stage-counter">
                {String(index + 1).padStart(2, "0")} / {String(Math.max(project.media.length, 1)).padStart(2, "0")}
              </div>
            </div>
            {media?.caption && <p className="portfolio-caption">{media.caption}</p>}
            {project.media.length > 1 && (
              <div className="portfolio-thumbnails">
                {project.media.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    aria-label={`View media ${itemIndex + 1}`}
                    className={itemIndex === index ? "is-active" : ""}
                  >
                    <MediaFrame
                      src={assetUrls[item.assetId]}
                      type={item.type}
                      alt={item.caption || project.title}
                      className="absolute inset-0"
                    />
                    {item.type === "video" && <Play className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="portfolio-modal-story">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="portfolio-index-label">{project.year}</span>
            </div>
            <h3 className="portfolio-modal-title">{project.title}</h3>
            <p className="portfolio-modal-tagline">{project.tagline}</p>

            <dl className="portfolio-facts">
              {project.client && <div><dt>Client</dt><dd>{project.client}</dd></div>}
              {accountName && <div><dt>Account</dt><dd>{accountName}</dd></div>}
            </dl>

            {project.tags.length > 0 && (
              <div className="portfolio-tag-row">
                {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            )}

            <div className="portfolio-narrative">
              {[
                ["Overview", project.summary],
                ["Challenge", project.challenge],
                ["Solution", project.solution],
                ["Impact", project.impact],
              ].filter(([, body]) => Boolean(body)).map(([label, body]) => (
                <section key={label}>
                  <h4>{label}</h4>
                  <p>{body}</p>
                </section>
              ))}
            </div>

            {project.links.some((link) => link.url) && (
              <div className="portfolio-links">
                {project.links.filter((link) => link.url).map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer noopener">
                    <LinkIcon kind={link.kind} />
                    <span>{link.label}</span>
                    <ArrowRight className="ml-auto size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function ProjectCard({
  project,
  assetUrls,
  featured,
  index,
  onOpen,
}: {
  project: PortfolioProject;
  assetUrls: Record<string, string>;
  featured: boolean;
  index: number;
  onOpen: () => void;
}) {
  const cover = coverMedia(project);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={featured ? "portfolio-feature-card" : "portfolio-index-card"}
    >
      <div className={featured ? "portfolio-feature-media" : "portfolio-index-media"}>
        <MediaFrame
          src={cover ? assetUrls[cover.assetId] : undefined}
          type={cover?.type}
          alt={project.title}
          autoPlay={cover?.type === "video"}
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.035]"
        />
        <div className="portfolio-media-shade" />
        <div className="portfolio-card-badges">
          <StatusBadge status={project.status} />
          {project.featured && <span className="portfolio-featured-pill">Featured</span>}
        </div>
        {project.media.length > 1 && (
          <span className="portfolio-media-count"><Layers className="size-3.5" /> {project.media.length}</span>
        )}
      </div>
      <div className={featured ? "portfolio-feature-copy" : "portfolio-index-copy"}>
        <span className="portfolio-project-number">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0">
          <h3>{project.title}</h3>
          <p className="portfolio-project-kicker">{project.tagline}</p>
          {project.summary && <p className="portfolio-project-summary">{project.summary}</p>}
          {project.tags.length > 0 && (
            <div className="portfolio-tag-row">
              {project.tags.slice(0, featured ? 5 : 3).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}
        </div>
        <span className="portfolio-open-action" aria-hidden="true"><ArrowRight className="size-5" /></span>
      </div>
    </button>
  );
}

export default function PortfolioSection({ portfolio, headingFont }: { portfolio: PortfolioSettings; headingFont: string }) {
  const [statusFilter, setStatusFilter] = useState<"all" | PortfolioStatus>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>();
  const assetUrls = useResolvedAssets(portfolioAssetIds(portfolio));

  const published = useMemo(() => portfolio.items.filter((item) => item.published !== false), [portfolio.items]);
  const tags = useMemo(() => Array.from(new Set(published.flatMap((item) => item.tags))).slice(0, 14), [published]);
  const visible = published.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (tagFilter !== "all" && !item.tags.includes(tagFilter)) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return [item.title, item.tagline, item.client, ...item.tags].join(" ").toLowerCase().includes(needle);
  });
  const ordered = [...visible].sort((a, b) => Number(b.featured) - Number(a.featured));
  const openProject = published.find((item) => item.id === openId);
  const account = openProject ? portfolio.accounts.find((item) => item.id === openProject.accountId) : undefined;

  if (published.length === 0) return null;

  return (
    <section id="portfolio" className="portfolio-showcase">
      <div className="portfolio-rule" />
      <div className="portfolio-inner">
        <header className="portfolio-header">
          <div className="portfolio-heading-block">
            <span className="portfolio-eyebrow">{portfolio.eyebrow}</span>
            <h2 className={headingFont ? headingFont : undefined}>{portfolio.title}</h2>
            {portfolio.subtitle && <p>{portfolio.subtitle}</p>}
          </div>
          <div className="portfolio-tools" aria-label="Portfolio filters">
            <div className="portfolio-filter-tabs">
              {(["all", "live", "development"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value}>
                  {value === "all" ? "All work" : PORTFOLIO_STATUS_LABEL[value]}
                </button>
              ))}
            </div>
            <div className="portfolio-search-row">
              {tags.length > 0 && (
                <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} aria-label="Filter by technology">
                  <option value="all">All technologies</option>
                  {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              )}
              <label>
                <Search className="size-4" />
                <input placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </div>
        </header>

        {ordered.length > 0 ? (
          <div className="portfolio-editorial-grid">
            {ordered.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                assetUrls={assetUrls}
                featured={index === 0}
                index={index}
                onOpen={() => setOpenId(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="portfolio-empty-results">No projects match these filters.</div>
        )}
      </div>

      {openProject && (
        <ProjectModal project={openProject} assetUrls={assetUrls} accountName={account?.name} onClose={() => setOpenId(undefined)} />
      )}
    </section>
  );
}
