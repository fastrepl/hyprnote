import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allChangelogs } from "content-collections";
import semver from "semver";

export const Route = createFileRoute("/_view/changelog/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const changelog = allChangelogs.find(
      (changelog) => changelog.slug === params.slug,
    );
    if (!changelog) {
      throw notFound();
    }

    const sortedChangelogs = [...allChangelogs].sort((a, b) =>
      semver.rcompare(a.version, b.version),
    );

    const currentIndex = sortedChangelogs.findIndex(
      (c) => c.slug === changelog.slug,
    );
    const nextChangelog =
      currentIndex > 0 ? sortedChangelogs[currentIndex - 1] : null;
    const prevChangelog =
      currentIndex < sortedChangelogs.length - 1
        ? sortedChangelogs[currentIndex + 1]
        : null;

    return { changelog, nextChangelog, prevChangelog };
  },
});

function Component() {
  const { changelog, nextChangelog, prevChangelog } = Route.useLoaderData();

  const isLatest = nextChangelog === null;

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link
          to="/changelog"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors mb-8"
        >
          <span>←</span>
          <span>Back to changelog</span>
        </Link>

        <header className="mb-12 pb-8 border-b border-neutral-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-stone-50 border border-neutral-100">
              <Icon
                icon={isLatest ? "mdi:star" : "mdi:package-variant"}
                className="text-2xl text-stone-600"
              />
            </div>
            {isLatest && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-stone-100 text-stone-700 rounded-full">
                <Icon icon="mdi:star" className="text-base" />
                Latest Release
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl font-serif text-stone-600 mb-4">
            Version {changelog.version}
          </h1>
        </header>

        <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-4xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8 max-w-none">
          <MDXContent code={changelog.mdx} />
        </article>

        <footer className="mt-16 pt-8 border-t border-neutral-100">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {prevChangelog ? (
              <Link
                to="/changelog/$slug"
                params={{ slug: prevChangelog.slug }}
                className="flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors group"
              >
                <Icon
                  icon="mdi:arrow-left"
                  className="text-xl group-hover:-translate-x-1 transition-transform"
                />
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Older</div>
                  <div className="font-medium">
                    Version {prevChangelog.version}
                  </div>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextChangelog ? (
              <Link
                to="/changelog/$slug"
                params={{ slug: nextChangelog.slug }}
                className="flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors group text-right sm:text-left"
              >
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Newer</div>
                  <div className="font-medium">
                    Version {nextChangelog.version}
                  </div>
                </div>
                <Icon
                  icon="mdi:arrow-right"
                  className="text-xl group-hover:translate-x-1 transition-transform"
                />
              </Link>
            ) : (
              <div />
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/changelog"
              className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium"
            >
              <Icon icon="mdi:format-list-bulleted" />
              <span>View all releases</span>
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
