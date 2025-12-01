import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allRoadmaps } from "content-collections";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { Mermaid, Tweet } from "@/components/mdx";

export const Route = createFileRoute("/_view/roadmap/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const item = allRoadmaps.find((r) => r.slug === params.slug);
    if (!item) {
      throw notFound();
    }
    return { item };
  },
  head: ({ loaderData }) => {
    const { item } = loaderData!;
    const url = `https://hyprnote.com/roadmap/${item.slug}`;

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
  const { item } = Route.useLoaderData();

  const statusConfig = {
    done: {
      label: "Done",
      icon: "mdi:check-circle",
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    "in-progress": {
      label: "In Progress",
      icon: "mdi:progress-clock",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    todo: {
      label: "To Do",
      icon: "mdi:calendar-clock",
      iconColor: "text-neutral-400",
      bgColor: "bg-neutral-50",
      borderColor: "border-neutral-200",
    },
  };

  const status = statusConfig[item.status];

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-x border-neutral-100 bg-white">
        <Link
          to="/roadmap"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors mb-8 font-serif"
        >
          <Icon icon="mdi:arrow-left" className="text-base" />
          <span>Back to roadmap</span>
        </Link>

        <article>
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn([
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border",
                  status.bgColor,
                  status.borderColor,
                ])}
              >
                <Icon
                  icon={status.icon}
                  className={cn(["text-lg", status.iconColor])}
                />
                <span className="text-sm font-medium text-stone-600">
                  {status.label}
                </span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 mb-4">
              {item.title}
            </h1>

            {item.labels && item.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {item.labels.map((label) => (
                  <span
                    key={label}
                    className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <time dateTime={item.created}>
                Created{" "}
                {new Date(item.created).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {item.updated && item.updated !== item.created && (
                <>
                  <span>·</span>
                  <span>
                    Updated{" "}
                    {new Date(item.updated).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </>
              )}
            </div>
          </header>

          <div className="prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-pre:prose-code:bg-transparent prose-pre:prose-code:border-0 prose-pre:prose-code:p-0 prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8">
            <MDXContent
              code={item.mdx}
              components={{
                Image,
                img: Image,
                mermaid: Mermaid,
                Mermaid,
                Tweet,
              }}
            />
          </div>

          {item.githubIssues && item.githubIssues.length > 0 && (
            <div className="mt-12 pt-8 border-t border-neutral-100">
              <h3 className="text-xl font-serif text-stone-600 mb-6">
                Related GitHub Issues
              </h3>
              <div className="space-y-4">
                {item.githubIssues.map((url) => (
                  <GitHubIssuePreview key={url} url={url} />
                ))}
              </div>
            </div>
          )}
        </article>

        <footer className="mt-16 pt-8 border-t border-neutral-100">
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium"
          >
            <span>←</span>
            <span>Back to roadmap</span>
          </Link>
        </footer>
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
