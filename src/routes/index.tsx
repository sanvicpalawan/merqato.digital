import { createFileRoute } from "@tanstack/react-router";

import MerqatoSite from "@/components/merqato/MerqatoSite";

const title = "merQato.digital — Digital growth studio";
const description =
  "merQato.digital builds fast, connected digital experiences: web presence, automation and always-on support packages for growing brands.";

export const Route = createFileRoute("/")({
  // The site reads theme, language and saved edits from browser storage, so it
  // renders client-side to keep that state consistent.
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MerqatoSite,
});
