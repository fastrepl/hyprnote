import assert from "node:assert/strict";
import test from "node:test";

import {
  getBlogOgImageUrl,
  getBlogPostingJsonLd,
  getCanonicalUrl,
  getPublicPageLinkHref,
  getSoftwareApplicationJsonLd,
} from "./seo.ts";

test("builds canonical urls with exactly one trailing slash", () => {
  assert.equal(getCanonicalUrl(), "https://anarlog.so/");
  assert.equal(getCanonicalUrl("/blog"), "https://anarlog.so/blog/");
  assert.equal(
    getCanonicalUrl("/blog/granola-ai-alternatives"),
    "https://anarlog.so/blog/granola-ai-alternatives/",
  );
  assert.equal(getCanonicalUrl("/download/"), "https://anarlog.so/download/");
  assert.equal(getCanonicalUrl("download"), "https://anarlog.so/download/");
});

test("article links skip canonical redirects without losing queries or anchors", () => {
  assert.equal(
    getPublicPageLinkHref("/blog/is-otter-ai-safe#data-collection"),
    "/blog/is-otter-ai-safe/#data-collection",
  );
  assert.equal(
    getPublicPageLinkHref("https://anarlog.so/download?source=article#desktop"),
    "https://anarlog.so/download/?source=article#desktop",
  );
  for (const href of [
    "/blog/is-otter-ai-safe/",
    "https://docs.anarlog.so/offline",
    "//example.com/blog/notes",
    "/\\example.com/blog/notes",
    "/\\[",
    "/llms.txt",
    "/auth?flow=web",
    "#data-collection",
    "mailto:team@fastrepl.com",
  ]) {
    assert.equal(getPublicPageLinkHref(href), href);
  }
});

test("emits offers when pricing is supplied", () => {
  const jsonLd = getSoftwareApplicationJsonLd({
    description: "Anarlog",
    aggregateOffer: { lowPrice: 0, highPrice: 15, offerCount: 2 },
  });

  assert.deepEqual(jsonLd.offers, {
    "@type": "AggregateOffer",
    url: "https://anarlog.so/",
    priceCurrency: "USD",
    lowPrice: 0,
    highPrice: 15,
    offerCount: 2,
  });
});

test("builds blog posting metadata with typed authors", () => {
  const url = getCanonicalUrl("/blog/local-ai-meeting-notes");
  const jsonLd = getBlogPostingJsonLd({
    url,
    headline: "Local AI meeting notes",
    description: "A practical guide.",
    image: getBlogOgImageUrl("local-ai-meeting-notes"),
    datePublished: "2026-01-01",
    authors: ["Jeehoon Ong", "Anarlog Team"],
  });

  assert.deepEqual(jsonLd.author, [
    { "@type": "Person", name: "Jeehoon Ong" },
    { "@type": "Organization", name: "Anarlog Team" },
  ]);
  assert.deepEqual(jsonLd.mainEntityOfPage, {
    "@type": "WebPage",
    "@id": url,
  });
  assert.equal(jsonLd.publisher.name, "Anarlog");
  assert.equal(
    jsonLd.image,
    "https://static.anarlog.so/og/blog/local-ai-meeting-notes",
  );
});
