import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allRoadmaps } from "content-collections";
import { useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { GithubStars } from "@/components/github-stars";
import { Image } from "@/components/image";
import { MDXLink } from "@/components/mdx";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";

export const Route = createFileRoute("/_view/roadmap/")({
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

type RoadmapStatus = "done" | "in-progress" | "todo";

type RoadmapItem = {
  slug: string;
  title: string;
  status: RoadmapStatus;
  labels: string[];
  githubIssues: string[];
  created: string;
  updated?: string;
  mdx: string;
};

const DEFAULT_VISIBLE_ITEMS = 5;

function getRoadmapItems(): RoadmapItem[] {
  return allRoadmaps.map((item) => ({
    slug: item.slug,
    title: item.title,
    status: item.status,
    labels: item.labels || [],
    githubIssues: item.githubIssues || [],
    created: item.created,
    updated: item.updated,
    mdx: item.mdx,
  }));
}

function Component() {
  const items = getRoadmapItems();
  const heroInputRef = useRef<HTMLInputElement>(null);

  const done = items.filter((item) => item.status === "done");
  const inProgress = items.filter((item) => item.status === "in-progress");
  const todo = items.filter((item) => item.status === "todo");

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

          <KanbanView done={done} inProgress={inProgress} todo={todo} />
          <ColumnView done={done} inProgress={inProgress} todo={todo} />

          <CTASection heroInputRef={heroInputRef} />
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
  done: RoadmapItem[];
  inProgress: RoadmapItem[];
  todo: RoadmapItem[];
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
  items: RoadmapItem[];
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
            <RoadmapCard key={item.slug} item={item} compact />
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
  done: RoadmapItem[];
  inProgress: RoadmapItem[];
  todo: RoadmapItem[];
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
  items: RoadmapItem[];
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
          <RoadmapCard key={item.slug} item={item} />
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

function RoadmapCard({
  item,
  compact = false,
}: {
  item: RoadmapItem;
  compact?: boolean;
}) {
  return (
    <Link
      to="/roadmap/$slug"
      params={{ slug: item.slug }}
      className={cn([
        "block p-4 border border-neutral-200 rounded-sm bg-white",
        "hover:shadow-sm hover:border-neutral-300 transition-all",
        "group",
      ])}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className={cn([
              "font-medium text-stone-600 group-hover:text-stone-800",
              "transition-colors wrap-break-word",
              compact ? "text-sm" : "text-base",
            ])}
          >
            {item.title}
          </h3>
          {item.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.labels.slice(0, compact ? 2 : 4).map((label) => (
                <span
                  key={label}
                  className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
                >
                  {label}
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
      </div>
      {!compact && (
        <div className="prose prose-sm prose-stone max-w-none wrap-break-word">
          <MDXContent code={item.mdx} components={{ a: MDXLink }} />
        </div>
      )}
    </Link>
  );
}

function CTASection({
  heroInputRef,
}: {
  heroInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const platform = usePlatform();
  const platformCTA = getPlatformCTA(platform);

  const getButtonLabel = () => {
    if (platform === "mobile") {
      return "Get reminder";
    }
    return platformCTA.label;
  };

  const handleCTAClick = () => {
    if (platformCTA.action === "waitlist") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        if (heroInputRef.current) {
          heroInputRef.current.focus();
          heroInputRef.current.parentElement?.classList.add(
            "animate-shake",
            "border-stone-600",
          );
          setTimeout(() => {
            heroInputRef.current?.parentElement?.classList.remove(
              "animate-shake",
              "border-stone-600",
            );
          }, 500);
        }
      }, 500);
    }
  };

  return (
    <section className="mt-16 py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 -mx-6 px-6">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Where conversations
          <br className="sm:hidden" /> stay yours
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Start using Hyprnote today and bring clarity to your back-to-back
          meetings
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          {platformCTA.action === "download" ? (
            <DownloadButton />
          ) : (
            <button
              onClick={handleCTAClick}
              className={cn([
                "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
                "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                "transition-all",
              ])}
            >
              {getButtonLabel()}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </button>
          )}
          <div className="hidden sm:block">
            <GithubStars />
          </div>
        </div>
      </div>
    </section>
  );
}
