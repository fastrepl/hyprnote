export const ANARLOG_SITE_URL = "https://anarlog.so";
export const ANARLOG_SITE_NAME = "anarlog";
export const DEFAULT_OG_IMAGE_URL = `${ANARLOG_SITE_URL}/og.jpg`;

/**
 * The site serves every page at a trailing-slash URL and 308-redirects the
 * bare form, so canonical tags, og:url, and sitemap entries must all carry the
 * slash or they point at a redirect.
 */
export function getCanonicalUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withSlash = normalized.endsWith("/") ? normalized : `${normalized}/`;
  return `${ANARLOG_SITE_URL}${withSlash}`;
}

export function getPublicPageLinkHref(href: string) {
  if (
    href.startsWith("//") ||
    (!href.startsWith("/") && !href.startsWith(`${ANARLOG_SITE_URL}/`))
  ) {
    return href;
  }

  let url: URL;
  try {
    url = new URL(href, ANARLOG_SITE_URL);
  } catch {
    return href;
  }
  if (url.origin !== ANARLOG_SITE_URL) return href;
  const isPublicPage =
    url.pathname.startsWith("/blog/") ||
    url.pathname.startsWith("/guides/") ||
    [
      "/blog",
      "/download",
      "/pricing",
      "/enterprise",
      "/security",
      "/about",
      "/privacy",
      "/terms",
      "/changelog",
    ].includes(url.pathname);

  if (!isPublicPage || url.pathname.endsWith("/")) return href;

  url.pathname += "/";
  return href.startsWith("/")
    ? `${url.pathname}${url.search}${url.hash}`
    : url.href;
}
export const ROOT_TITLE = "Private AI Meeting Notetaker | Anarlog";
export const ROOT_DESCRIPTION =
  "Anarlog is the open-source, local-first alternative to Granola. Take private meeting notes, get editable AI summaries, and keep your data and AI stack yours.";
export const ROOT_KEYWORDS =
  "private meeting notes, open source meeting notes, local-first AI notepad, Granola AI alternative, AI meeting notes, local meeting transcription, bot-free AI notes, offline meeting notes, on-device AI, BYOK AI, meeting transcription, meeting summaries, data ownership";

export function getBlogOgImageUrl(slug: string) {
  return `https://static.anarlog.so/og/blog/${encodeURIComponent(slug)}`;
}

export function getPublicSharedNoteOgImageUrl(publicSlug: string) {
  return `${ANARLOG_SITE_URL}/api/og/share/public/${encodeURIComponent(publicSlug)}`;
}

export function getStableSharedNoteOgImageUrl(shareId: string) {
  return `${ANARLOG_SITE_URL}/api/og/share/link/${encodeURIComponent(shareId)}`;
}

export function getLinkSharedNoteOgImageUrl(
  shareId: string,
  previewToken: string,
) {
  const url = new URL(
    `/api/og/share/link/${encodeURIComponent(shareId)}`,
    ANARLOG_SITE_URL,
  );
  url.searchParams.set("preview", previewToken);
  return url.toString();
}

export function getShortLinkSharedNoteOgImageUrl(linkId: string) {
  return `${ANARLOG_SITE_URL}/api/og/share/t/${encodeURIComponent(linkId)}`;
}

type StructuredDataNode = Record<string, unknown>;

export function getStructuredDataGraph(nodes: StructuredDataNode[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function getOrganizationJsonLd() {
  return {
    "@type": "Organization",
    name: "Anarlog",
    url: getCanonicalUrl(),
    logo: `${ANARLOG_SITE_URL}/logo.svg`,
  };
}

export function getSoftwareApplicationJsonLd({
  url = getCanonicalUrl(),
  description,
  featureList,
  aggregateOffer,
}: {
  url?: string;
  description: string;
  featureList?: string[];
  aggregateOffer?: {
    lowPrice: number;
    highPrice: number;
    offerCount: number;
  };
}) {
  return {
    "@type": "SoftwareApplication",
    name: "Anarlog",
    url,
    description,
    applicationCategory: "BusinessApplication",
    operatingSystem: ["macOS", "Windows", "Linux"],
    downloadUrl: getCanonicalUrl("/download"),
    publisher: getOrganizationJsonLd(),
    ...(featureList ? { featureList } : {}),
    ...(aggregateOffer
      ? {
          offers: {
            "@type": "AggregateOffer",
            url,
            priceCurrency: "USD",
            ...aggregateOffer,
          },
        }
      : {}),
  };
}

export function getBreadcrumbListJsonLd(
  items: Array<{ name: string; item: string }>,
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function getBlogPostingJsonLd({
  url,
  headline,
  description,
  image,
  datePublished,
  authors,
}: {
  url: string;
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  authors: string[];
}) {
  return {
    "@type": "BlogPosting",
    url,
    headline,
    description,
    image,
    datePublished,
    author: authors.map((name) => ({
      "@type": name === "Anarlog Team" ? "Organization" : "Person",
      name,
    })),
    publisher: getOrganizationJsonLd(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
