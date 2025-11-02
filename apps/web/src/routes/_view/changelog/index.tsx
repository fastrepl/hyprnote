import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allChangelogs, type Changelog } from "content-collections";

export const Route = createFileRoute("/_view/changelog/")({
  component: Component,
});

function Component() {
  const sortedChangelogs = [...allChangelogs].reverse();

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-16 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-stone-50 border border-neutral-100 mb-6">
            <Icon icon="mdi:update" className="text-3xl text-stone-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-stone-600 mb-4">
            Changelog
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Track every update, improvement, and fix to Hyprnote
          </p>
        </header>

        {sortedChangelogs.length === 0
          ? (
            <div className="text-center py-16">
              <div className="mb-6">
                <Icon icon="mdi:clipboard-text-outline" className="text-6xl text-neutral-300 mx-auto" />
              </div>
              <p className="text-neutral-500">No releases yet. Stay tuned!</p>
            </div>
          )
          : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-neutral-200 hidden sm:block" />

              <div className="space-y-12">
                {sortedChangelogs.map((changelog, index) => (
                  <ChangelogCard
                    key={changelog._meta.filePath}
                    changelog={changelog}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

function ChangelogCard({ changelog, isFirst }: { changelog: Changelog; isFirst: boolean }) {
  return (
    <Link
      to="/changelog/$slug"
      params={{ slug: changelog.slug }}
      className="group block"
    >
      <article className="relative sm:pl-16">
        <div className="absolute left-0 top-2 hidden sm:flex items-center justify-center">
          <div className="size-16 rounded-full bg-white border-2 border-neutral-200 group-hover:border-stone-400 transition-colors flex items-center justify-center">
            <Icon
              icon={isFirst ? "mdi:star" : "mdi:package-variant"}
              className="text-2xl text-stone-600 group-hover:text-stone-800 transition-colors"
            />
          </div>
        </div>

        <div className="border border-neutral-100 rounded-sm bg-white hover:shadow-lg hover:border-neutral-200 transition-all duration-300 p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-serif text-stone-600 group-hover:text-stone-800 transition-colors">
                  Version {changelog.version}
                </h2>
                {isFirst && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-stone-100 text-stone-700 rounded-full">
                    <Icon icon="mdi:star" className="text-sm" />
                    Latest
                  </span>
                )}
              </div>
            </div>

            <Icon
              icon="mdi:arrow-right"
              className="text-xl text-neutral-400 group-hover:text-stone-600 group-hover:translate-x-1 transition-all shrink-0"
            />
          </div>

          <div className="flex items-center text-sm text-neutral-500">
            <span className="group-hover:text-stone-600 transition-colors font-medium">
              View release notes →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
