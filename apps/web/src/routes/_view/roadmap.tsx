import { Icon } from "@iconify-icon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { GITHUB_ORG_REPO } from "@/queries";

export const Route = createFileRoute("/_view/roadmap")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Roadmap - Hyprnote" },
      {
        name: "description",
        content:
          "See what we're building next for Hyprnote. Our product roadmap and future plans.",
      },
    ],
  }),
});

type GitHubLabel = {
  name: string;
  color: string;
};

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: GitHubLabel[];
  created_at: string;
  closed_at: string | null;
  pull_request?: object;
};

type RoadmapStatus = "done" | "in-progress" | "todo";

type RoadmapIssue = {
  number: number;
  title: string;
  description: string;
  url: string;
  status: RoadmapStatus;
  labels: GitHubLabel[];
  createdAt: string;
};

const DEFAULT_VISIBLE_ITEMS = 5;

function categorizeIssue(issue: GitHubIssue): RoadmapStatus {
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());

  if (issue.state === "closed") {
    return "done";
  }

  if (
    labelNames.some((l) =>
      ["in progress", "in-progress", "wip", "working"].includes(l),
    )
  ) {
    return "in-progress";
  }

  return "todo";
}

function transformIssue(issue: GitHubIssue): RoadmapIssue {
  const firstLine = issue.body?.split("\n")[0] || "";
  const description =
    firstLine.length > 150 ? firstLine.slice(0, 147) + "..." : firstLine;

  return {
    number: issue.number,
    title: issue.title,
    description: description || "No description provided.",
    url: issue.html_url,
    status: categorizeIssue(issue),
    labels: issue.labels,
    createdAt: issue.created_at,
  };
}

function useGitHubIssues() {
  return useQuery({
    queryKey: ["github-roadmap-issues"],
    queryFn: async () => {
      const roadmapLabels = ["enhancement", "feature", "improvement"];

      const [openResponse, closedResponse] = await Promise.all([
        fetch(
          `https://api.github.com/repos/${GITHUB_ORG_REPO}/issues?state=open&per_page=100&sort=created&direction=desc`,
        ),
        fetch(
          `https://api.github.com/repos/${GITHUB_ORG_REPO}/issues?state=closed&per_page=50&sort=updated&direction=desc`,
        ),
      ]);

      const openIssues: GitHubIssue[] = await openResponse.json();
      const closedIssues: GitHubIssue[] = await closedResponse.json();

      const allIssues = [...openIssues, ...closedIssues].filter((issue) => {
        if (issue.pull_request) return false;
        const issueLabels = issue.labels.map((l) => l.name.toLowerCase());
        return issueLabels.some((label) => roadmapLabels.includes(label));
      });

      return allIssues.map(transformIssue);
    },
    staleTime: 5 * 60 * 1000,
  });
}

function Component() {
  const { data: issues, isLoading, error } = useGitHubIssues();

  const done = issues?.filter((item) => item.status === "done") ?? [];
  const inProgress =
    issues?.filter((item) => item.status === "in-progress") ?? [];
  const todo = issues?.filter((item) => item.status === "todo") ?? [];

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Product Roadmap
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              See what we're building and what's coming next. We're always
              listening to feedback from our community.
            </p>
          </header>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Icon
                icon="mdi:loading"
                className="text-4xl text-stone-400 animate-spin"
              />
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <Icon
                icon="mdi:alert-circle-outline"
                className="text-4xl text-red-400 mb-4"
              />
              <p className="text-neutral-600">
                Failed to load roadmap. Please try again later.
              </p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <KanbanView done={done} inProgress={inProgress} todo={todo} />
              <ColumnView done={done} inProgress={inProgress} todo={todo} />
            </>
          )}

          <div className="mt-16 bg-stone-50 border border-neutral-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-serif text-stone-600 mb-4">
              Have a feature request?
            </h3>
            <p className="text-neutral-600 mb-6">
              We'd love to hear your ideas. Join our community and share your
              thoughts.
            </p>
            <a
              href="https://github.com/fastrepl/hyprnote/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className={cn([
                "inline-block px-6 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Share feedback
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanView({
  done,
  inProgress,
  todo,
}: {
  done: RoadmapIssue[];
  inProgress: RoadmapIssue[];
  todo: RoadmapIssue[];
}) {
  return (
    <div className="hidden lg:grid lg:grid-cols-3 gap-6">
      <KanbanColumn
        title="To Do"
        icon="mdi:calendar-clock"
        iconColor="text-neutral-400"
        items={todo}
        status="todo"
      />
      <KanbanColumn
        title="In Progress"
        icon="mdi:progress-clock"
        iconColor="text-blue-600"
        items={inProgress}
        status="in-progress"
      />
      <KanbanColumn
        title="Done"
        icon="mdi:check-circle"
        iconColor="text-green-600"
        items={done}
        status="done"
      />
    </div>
  );
}

function KanbanColumn({
  title,
  icon,
  iconColor,
  items,
  status,
}: {
  title: string;
  icon: string;
  iconColor: string;
  items: RoadmapIssue[];
  status: RoadmapStatus;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, DEFAULT_VISIBLE_ITEMS);
  const hasMore = items.length > DEFAULT_VISIBLE_ITEMS;

  return (
    <div className="flex flex-col">
      <div
        className={cn([
          "flex items-center gap-2 mb-4 pb-3",
          "border-b-2",
          status === "done" && "border-green-200",
          status === "in-progress" && "border-blue-200",
          status === "todo" && "border-neutral-200",
        ])}
      >
        <Icon icon={icon} className={cn(["text-xl", iconColor])} />
        <h2 className="text-lg font-medium text-stone-600">{title}</h2>
        <span className="text-sm text-neutral-400 ml-auto">{items.length}</span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {visibleItems.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">
            No items
          </div>
        ) : (
          visibleItems.map((item) => (
            <IssueCard key={item.number} item={item} compact />
          ))
        )}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn([
              "text-sm text-stone-500 hover:text-stone-700",
              "py-2 transition-colors",
            ])}
          >
            {showAll
              ? "Show less"
              : `Show ${items.length - DEFAULT_VISIBLE_ITEMS} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function ColumnView({
  done,
  inProgress,
  todo,
}: {
  done: RoadmapIssue[];
  inProgress: RoadmapIssue[];
  todo: RoadmapIssue[];
}) {
  return (
    <div className="lg:hidden space-y-12">
      <ColumnSection
        title="To Do"
        icon="mdi:calendar-clock"
        iconColor="text-neutral-400"
        items={todo}
      />
      <ColumnSection
        title="In Progress"
        icon="mdi:progress-clock"
        iconColor="text-blue-600"
        items={inProgress}
      />
      <ColumnSection
        title="Done"
        icon="mdi:check-circle"
        iconColor="text-green-600"
        items={done}
      />
    </div>
  );
}

function ColumnSection({
  title,
  icon,
  iconColor,
  items,
}: {
  title: string;
  icon: string;
  iconColor: string;
  items: RoadmapIssue[];
}) {
  const [showAll, setShowAll] = useState(false);
  const mobileLimit = 3;
  const visibleItems = showAll ? items : items.slice(0, mobileLimit);
  const hasMore = items.length > mobileLimit;

  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <Icon icon={icon} className={cn(["text-2xl", iconColor])} />
        <h2 className="text-2xl font-serif text-stone-600">{title}</h2>
        <span className="text-sm text-neutral-400">({items.length})</span>
      </div>
      <div className="space-y-4">
        {visibleItems.map((item) => (
          <IssueCard key={item.number} item={item} />
        ))}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn([
              "w-full text-sm text-stone-500 hover:text-stone-700",
              "py-3 border border-dashed border-neutral-200 rounded-lg",
              "hover:border-neutral-300 transition-colors",
            ])}
          >
            {showAll
              ? "Show less"
              : `Show ${items.length - mobileLimit} more items`}
          </button>
        )}
      </div>
    </section>
  );
}

function IssueCard({
  item,
  compact = false,
}: {
  item: RoadmapIssue;
  compact?: boolean;
}) {
  return (
    <Link
      to={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn([
        "block p-4 border border-neutral-200 rounded-lg bg-white",
        "hover:shadow-sm hover:border-neutral-300 transition-all",
        "group",
      ])}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className={cn([
              "font-medium text-stone-600 group-hover:text-stone-800",
              "transition-colors line-clamp-2",
              compact ? "text-sm" : "text-base",
            ])}
          >
            {item.title}
          </h3>
          {!compact && item.description && (
            <p className="text-neutral-500 text-sm mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.labels.slice(0, compact ? 2 : 4).map((label) => (
                <span
                  key={label.name}
                  className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
                >
                  {label.name}
                </span>
              ))}
              {item.labels.length > (compact ? 2 : 4) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                  +{item.labels.length - (compact ? 2 : 4)}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-neutral-400 shrink-0">
          #{item.number}
        </span>
      </div>
    </Link>
  );
}
