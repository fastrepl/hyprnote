import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

import {
  fetchRoadmapItem,
  type RoadmapItem,
  toggleVote,
} from "@/functions/roadmap";

export const Route = createFileRoute("/_view/roadmap/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const item = await fetchRoadmapItem({ data: { id: params.slug } });
    if (!item) {
      throw notFound();
    }
    return { item };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.item) {
      return { meta: [] };
    }

    const { item } = loaderData;
    const url = `https://hyprnote.com/roadmap/${item.id}`;

    return {
      meta: [
        { title: `${item.title} - Roadmap - Hyprnote` },
        {
          name: "description",
          content: `Roadmap item: ${item.title}`,
        },
        { property: "og:title", content: item.title },
        { property: "og:description", content: `Roadmap item: ${item.title}` },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: item.title },
        {
          name: "twitter:description",
          content: `Roadmap item: ${item.title}`,
        },
      ],
    };
  },
});

function Component() {
  const { item: initialItem } = Route.useLoaderData();
  const [item, setItem] = useState<RoadmapItem>(initialItem);
  const [isVoting, setIsVoting] = useState(false);

  const statusConfig = {
    done: {
      label: "Done",
      icon: "mdi:check-circle",
      className: "bg-linear-to-t from-green-200 to-green-100 text-green-900",
    },
    "in-progress": {
      label: "In Progress",
      icon: "mdi:progress-clock",
      className: "bg-linear-to-b from-[#03BCF1] to-[#127FE5] text-white",
    },
    todo: {
      label: "To Do",
      icon: "mdi:calendar-clock",
      className:
        "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900",
    },
  };

  const status = statusConfig[item.status];

  const handleVote = async () => {
    if (isVoting) return;

    setIsVoting(true);
    try {
      const result = await toggleVote({ data: { roadmapItemId: item.id } });

      if ("success" in result && result.success) {
        setItem((prev) => ({
          ...prev,
          vote_count: result.voted ? prev.vote_count + 1 : prev.vote_count - 1,
          user_has_voted: result.voted ?? false,
        }));
      }
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-x border-neutral-100 bg-white">
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors mb-8 font-serif"
        >
          <Icon icon="mdi:arrow-left" className="text-base" />
          <span>Back to roadmap</span>
        </Link>

        <article>
          <header className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <button
                onClick={handleVote}
                disabled={isVoting}
                className={cn([
                  "flex flex-col items-center justify-center px-3 py-2 rounded-lg",
                  "border transition-all min-w-[64px]",
                  item.user_has_voted
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-amber-200 hover:bg-amber-50",
                  isVoting && "opacity-50 cursor-not-allowed",
                ])}
              >
                <Icon
                  icon={
                    item.user_has_voted
                      ? "mdi:thumb-up"
                      : "mdi:thumb-up-outline"
                  }
                  className="text-2xl"
                />
                <span className="text-sm font-medium">{item.vote_count}</span>
              </button>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 flex-1">
                {item.title}
              </h1>
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className={cn([
                  "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                  status.className,
                ])}
              >
                <Icon icon={status.icon} className="text-xs" />
                {status.label}
              </span>

              {item.labels &&
                item.labels.length > 0 &&
                item.labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full capitalize"
                  >
                    {label}
                  </span>
                ))}
            </div>

            <div className="text-xs text-neutral-500 font-mono">
              {item.updated_at && item.updated_at !== item.created_at ? (
                <span>
                  Updated{" "}
                  {new Date(item.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  / Created{" "}
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : (
                <time dateTime={item.created_at}>
                  Created{" "}
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              )}
            </div>
          </header>

          {item.description && (
            <div className="prose prose-stone prose-lg max-w-none mb-8">
              <p>{item.description}</p>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-neutral-100">
            <h3 className="text-xl font-serif text-stone-600 mb-6">
              Related GitHub Issues
            </h3>
            {item.github_issues && item.github_issues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.github_issues.map((url) => (
                  <GitHubIssuePreview key={url} url={url} />
                ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">
                No related GitHub issues yet
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function GitHubIssuePreview({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn([
        "flex items-center gap-2 px-4 py-3 border border-neutral-200 rounded-lg bg-white",
        "text-sm text-stone-600 hover:text-stone-800 hover:border-neutral-300 transition-colors",
      ])}
    >
      <Icon icon="mdi:github" className="text-lg" />
      <span className="flex-1">{url}</span>
      <Icon icon="mdi:open-in-new" className="text-xs text-neutral-400" />
    </a>
  );
}
