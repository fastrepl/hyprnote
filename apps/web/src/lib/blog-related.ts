import type { ArticleSummary } from "content-collections";

export const transcriptionGuideSections = [
  {
    id: "choose-a-tool",
    title: "Choose a transcription tool",
    description:
      "Start with your operating system, whether you have a file or a live meeting, and the transcript access and exports you need.",
    slugs: [
      "free-transcription-software",
      "transcription-software-mac",
      "free-transcription-software-windows",
    ],
  },
  {
    id: "local-and-offline",
    title: "Set up local and offline transcription",
    description:
      "Local storage and local processing are separate choices. Check hardware support and prepare both speech and summary models before going offline.",
    slugs: [
      "offline-meeting-transcription-mac",
      "local-ai-meeting-notes",
      "open-source-meeting-transcription-software",
      "selfhosted-ai-notetakers",
    ],
  },
  {
    id: "meeting-platforms",
    title: "Transcribe the meetings you already use",
    description:
      "Compare native meeting features with desktop capture and meeting bots. Account plans, recording permissions, and language support affect the right setup.",
    slugs: [
      "how-to-transcribe-zoom-calls",
      "best-ai-notetaker-for-zoom",
      "best-ai-notetakers-google-meet",
      "google-gemini-meeting-notes",
      "best-ai-notetaker-for-microsoft-teams",
      "best-multilingual-ai-notetaker",
    ],
  },
];

const transcriptionSlugs = transcriptionGuideSections.flatMap(
  (section) => section.slugs,
);

const articleTopics = [
  transcriptionSlugs,
  ...transcriptionGuideSections.map((section) => section.slugs),
  [
    "offline-meeting-transcription-mac",
    "local-ai-meeting-notes",
    "open-source-meeting-transcription-software",
    "selfhosted-ai-notetakers",
    "can-you-transcribe-meetings-without-sending-data-to-cloud",
    "local-ai-privacy-tools",
    "ai-meeting-notes-without-bot",
    "bot-free-ai-meeting-assistants",
  ],
  [
    "how-to-transcribe-zoom-calls",
    "best-ai-notetaker-for-zoom",
    "zoom-ai-companion-review",
    "see-zoom-meeting-history",
  ],
  ["best-ai-notetakers-google-meet", "google-gemini-meeting-notes"],
  [
    "meeting-notes-template",
    "meeting-action-items",
    "meeting-decision-log",
    "meeting-minutes-software",
    "ai-meeting-summary-tools",
    "organize-meeting-notes",
    "obsidian-meeting-notes",
    "notion-meeting-notes",
  ],
  [
    "markdown-note-taking-apps",
    "notetakers-for-developers",
    "mac-productivity-apps",
    "obsidian-meeting-notes",
    "notion-meeting-notes",
  ],
  [
    "how-to-have-productive-one-on-one-meetings",
    "how-to-participate-in-meetings-effectively",
    "meeting-preparation-checklist",
    "how-to-reduce-meeting-fatigue",
    "meeting-productivity-tools",
    "best-ai-notetaker-for-in-person-meetings",
  ],
  [
    "chatgpt-claude-gemini-data-retention",
    "chatgpt-data-retention-policy",
    "anthropic-data-retention-policy",
    "google-gemini-data-retention-policy",
    "azure-open-ai-data-retention-policy",
    "openrouter-data-retention-policy",
    "mistral-data-retention-policy",
    "mistral-api-key",
  ],
  [
    "is-ai-notetaking-legal",
    "hipaa-compliant-ai-notetaker",
    "enterprise-ai-notetaking-tools",
    "what-makes-reliable-ai-note-taker",
  ],
  [
    "granola-ai-alternatives",
    "granola-ai-complaints",
    "is-granola-ai-safe",
    "meetily-vs-granola",
  ],
  [
    "otter-ai-alternatives",
    "otter-ai-review",
    "is-otter-ai-safe",
    "does-otter-use-recordings-to-train-ai",
  ],
  [
    "fireflies-ai-alternatives",
    "is-fireflies-ai-safe",
    "where-does-fireflies-store-data",
    "fireflies-recording-sharing-settings",
  ],
  ["fathom-ai-alternatives", "fathom-ai-review", "fathom-ai-complaints"],
  [
    "meetily-alternatives",
    "meetily-review",
    "meetily-vs-granola",
    "char-vs-meetily",
  ],
  ["tldv-alternatives", "tldv-review"],
];

export function isTranscriptionArticle(slug: string) {
  return transcriptionSlugs.includes(slug);
}

export function getRelatedArticles(
  article: ArticleSummary,
  articles: ArticleSummary[],
) {
  const topics = articleTopics.filter((slugs) => slugs.includes(article.slug));

  return articles
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => ({
      candidate,
      sharedTopics: topics.filter((slugs) => slugs.includes(candidate.slug))
        .length,
    }))
    .sort(
      (a, b) =>
        b.sharedTopics - a.sharedTopics ||
        (b.sharedTopics === 0
          ? Number(b.candidate.category === article.category) -
            Number(a.candidate.category === article.category)
          : 0) ||
        b.candidate.date.localeCompare(a.candidate.date) ||
        a.candidate.slug.localeCompare(b.candidate.slug),
    )
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}
