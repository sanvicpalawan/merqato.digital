export type PortfolioMediaType = "image" | "video";
export type PortfolioStatus = "live" | "development" | "concept" | "archived";

export type PortfolioMedia = {
  id: string;
  assetId: string;
  type: PortfolioMediaType;
  caption: string;
  cover: boolean;
};

export type PortfolioLinkKind =
  | "website"
  | "github"
  | "vercel"
  | "backend"
  | "design"
  | "custom";

export type PortfolioLink = {
  id: string;
  kind: PortfolioLinkKind;
  label: string;
  url: string;
};

export type PortfolioAccount = {
  id: string;
  name: string;
  role: string;
};

export type PortfolioProject = {
  id: string;
  title: string;
  tagline: string;
  client: string;
  year: string;
  status: PortfolioStatus;
  featured: boolean;
  published: boolean;
  summary: string;
  challenge: string;
  solution: string;
  impact: string;
  tags: string[];
  accountId: string;
  media: PortfolioMedia[];
  links: PortfolioLink[];
};

export type PortfolioSettings = {
  eyebrow: string;
  title: string;
  subtitle: string;
  accounts: PortfolioAccount[];
  items: PortfolioProject[];
};

export const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
  live: "Live",
  development: "In Development",
  concept: "Concept",
  archived: "Archived",
};

export const PORTFOLIO_STATUS_OPTIONS: PortfolioStatus[] = [
  "live",
  "development",
  "concept",
  "archived",
];

export const PORTFOLIO_LINK_PRESETS: { kind: PortfolioLinkKind; label: string }[] = [
  { kind: "website", label: "Live Website" },
  { kind: "github", label: "GitHub Repository" },
  { kind: "vercel", label: "Vercel Deployment" },
  { kind: "backend", label: "Backend / API" },
  { kind: "design", label: "Design File" },
  { kind: "custom", label: "Custom Link" },
];

export const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createPortfolioProject = (): PortfolioProject => ({
  id: newId(),
  title: "New Project",
  tagline: "Industry / Platform",
  client: "",
  year: String(new Date().getFullYear()),
  status: "development",
  featured: false,
  published: true,
  summary: "",
  challenge: "",
  solution: "",
  impact: "",
  tags: [],
  accountId: "",
  media: [],
  links: [],
});

export const DEFAULT_PORTFOLIO: PortfolioSettings = {
  eyebrow: "04 / Portfolio",
  title: "Systems We Have Shipped",
  subtitle:
    "Selected builds across resorts, tours and island operations — websites, automation agents and the backends that keep them running.",
  accounts: [
    { id: "merqato-studio", name: "merQato Studio", role: "Build & maintenance" },
  ],
  items: [
    {
      id: "sample-island-booking",
      title: "Island Booking Platform",
      tagline: "Tourism / Web + Automation",
      client: "Palawan Resort Group",
      year: "2026",
      status: "live",
      featured: true,
      published: true,
      summary:
        "A low-bandwidth booking platform with automated WhatsApp confirmations and offline-first rate management.",
      challenge:
        "Bookings arrived through scattered chat threads and were lost during brownouts and slow island connections.",
      solution:
        "A resilient web platform with cached rates, a WhatsApp booking agent and automated calendar and payment syncing.",
      impact: "Inquiries convert faster, with every booking captured in one operational dashboard.",
      tags: ["TanStack Start", "Supabase", "WhatsApp API", "Stripe"],
      accountId: "merqato-studio",
      media: [],
      links: [],
    },
  ],
};

export function normalizePortfolio(saved?: Partial<PortfolioSettings> | null): PortfolioSettings {
  const base = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO)) as PortfolioSettings;
  if (!saved) return base;
  return {
    eyebrow: saved.eyebrow ?? base.eyebrow,
    title: saved.title ?? base.title,
    subtitle: saved.subtitle ?? base.subtitle,
    accounts: saved.accounts ?? base.accounts,
    items: (saved.items ?? base.items).map((item) => ({
      ...createPortfolioProject(),
      ...item,
      tags: item.tags ?? [],
      media: item.media ?? [],
      links: item.links ?? [],
    })),
  };
}

export function portfolioAssetIds(portfolio: PortfolioSettings) {
  return portfolio.items.flatMap((item) => item.media.map((media) => media.assetId)).filter(Boolean);
}

export function coverMedia(project: PortfolioProject) {
  return project.media.find((media) => media.cover) ?? project.media[0];
}
