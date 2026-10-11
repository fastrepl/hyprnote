import type { ArticleSummary } from "content-collections";
import assert from "node:assert/strict";
import test from "node:test";

import { getRelatedArticles } from "./blog-related.ts";

test("related articles prioritize the reader's topic over newer unrelated posts", () => {
  const article = {
    slug: "free-transcription-software",
    category: "Comparisons",
    date: "2026-10-11",
    title: "Free transcription software",
    meta_description: "",
    author: ["Anarlog Team"],
  } satisfies ArticleSummary;
  const articles = [
    article,
    { ...article, slug: "is-granola-ai-safe", date: "2026-10-12" },
    {
      ...article,
      slug: "free-transcription-software-windows",
      category: "Guides" as const,
      date: "2026-09-26",
    },
    { ...article, slug: "transcription-software-mac", date: "2026-08-20" },
    { ...article, slug: "local-ai-meeting-notes", date: "2026-04-10" },
  ];

  assert.deepEqual(
    getRelatedArticles(article, articles).map(({ slug }) => slug),
    [
      "free-transcription-software-windows",
      "transcription-software-mac",
      "local-ai-meeting-notes",
    ],
  );
});
