import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import semver from "semver";

import { cn } from "@hypr/utils";

import { type ChangelogWithMeta, getChangelogList } from "@/changelog";
import { defaultMDXComponents } from "@/components/mdx";

export const Route = createFileRoute("/_view/changelog/")({
  component: Component,
  loader: async () => {
    const changelogs = getChangelogList();
    return { changelogs };
  },
  head: () => ({
    meta: [
      { title: "Changelog - Hyprnote" },
      {
        name: "description",
        content: "Track every update, improvement, and fix to Hyprnote",
      },
      { property: "og:title", content: "Changelog - Hyprnote" },
      {
        property: "og:description",
        content: "Track every update, improvement, and fix to Hyprnote",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/changelog" },
    ],
  }),
});

function Component() {
  const { changelogs } = Route.useLoaderData();

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-16 lg:py-24">
          <HeroSection />
          <div className="mt-16 max-w-4xl mx-auto">
            {changelogs.map((changelog, index) => (
              <ChangelogSection
                key={changelog.slug}
                changelog={changelog}
                isFirst={index === 0}
                isLast={index === changelogs.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
        Changelog
      </h1>
      <p className="text-lg sm:text-xl text-neutral-600">
        Track every update, improvement, and fix to Hyprnote
      </p>
    </div>
  );
}

function ChangelogSection({
  changelog,
  isFirst,
  isLast,
}: {
  changelog: ChangelogWithMeta;
  isFirst: boolean;
  isLast: boolean;
}) {
  const currentVersion = semver.parse(changelog.version);
  const isPrerelease = currentVersion && currentVersion.prerelease.length > 0;

  return (
    <section
      className={cn([
        "grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-12",
        !isLast && "border-b border-neutral-100 pb-12 mb-12",
      ])}
    >
      <div className="md:sticky md:top-24 md:self-start">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-stone-700">
            {changelog.version}
          </h2>
          {isFirst && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-linear-to-t from-amber-200 to-amber-100 text-amber-900 rounded-full">
              <Icon icon="ri:rocket-fill" className="text-xs" />
            </span>
          )}
          {isPrerelease && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-linear-to-b from-[#03BCF1] to-[#127FE5] text-white rounded-full">
              <Icon icon="ri:moon-fill" className="text-xs" />
            </span>
          )}
        </div>
      </div>

      <div>
        <article className="prose prose-stone prose-sm prose-headings:font-serif prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1 prose-ul:my-2 prose-li:my-0.5 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:text-stone-700 prose-img:rounded prose-img:border prose-img:border-neutral-200 prose-img:my-3 max-w-none">
          <MDXContent code={changelog.mdx} components={defaultMDXComponents} />
        </article>

        <Link
          to="/changelog/$slug"
          params={{ slug: changelog.slug }}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 transition-colors mt-4"
        >
          Read more
          <Icon icon="mdi:arrow-right" className="text-base" />
        </Link>
      </div>
    </section>
  );
}
