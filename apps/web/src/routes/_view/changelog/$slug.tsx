import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import semver from "semver";

import { getChangelogBySlug, getChangelogList } from "@/changelog";
import { defaultMDXComponents } from "@/components/mdx";
import { NotFoundContent } from "@/components/not-found";

export const Route = createFileRoute("/_view/changelog/$slug")({
  component: Component,
  notFoundComponent: NotFoundContent,
  loader: async ({ params }) => {
    const changelog = getChangelogBySlug(params.slug);
    if (!changelog) {
      throw notFound();
    }

    const allChangelogs = getChangelogList();

    const beforeVersion = changelog.beforeVersion;
    const diffUrl =
      beforeVersion != null
        ? `https://github.com/fastrepl/hyprnote/compare/desktop_v${beforeVersion}...desktop_v${changelog.version}`
        : null;

    return {
      changelog,
      allChangelogs,
      diffUrl,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const { changelog } = loaderData;
    const currentVersion = semver.parse(changelog.version);
    const isNightly = currentVersion && currentVersion.prerelease.length > 0;

    const title = `Version ${changelog.version} - Hyprnote Changelog`;
    const description = `Explore what's new in Hyprnote version ${changelog.version}${isNightly ? " (Nightly)" : ""}.`;
    const url = `https://hyprnote.com/changelog/${changelog.slug}`;
    const ogImageUrl = `https://hyprnote.com/og?type=changelog&version=${encodeURIComponent(changelog.version)}&v=1`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@tryhyprnote" },
        { name: "twitter:creator", content: "@tryhyprnote" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:url", content: url },
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
});

function Component() {
  const { changelog, diffUrl } = Route.useLoaderData();

  const currentVersion = semver.parse(changelog.version);
  const isPrerelease = !!(
    currentVersion && currentVersion.prerelease.length > 0
  );
  const isLatest = changelog.newerSlug === null;

  let prereleaseType = "";
  let buildNumber = "";
  if (isPrerelease && currentVersion && currentVersion.prerelease.length > 0) {
    prereleaseType = currentVersion.prerelease[0]?.toString() || "";
    buildNumber = currentVersion.prerelease[1]?.toString() || "";
  }

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
          <div className="text-center">
            <Link
              to="/changelog"
              className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              All versions
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-stone-600">
                {changelog.version}
              </h1>
              {isLatest && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-linear-to-t from-amber-200 to-amber-100 text-amber-900 rounded-full">
                  <Icon icon="ri:rocket-fill" className="text-xs" />
                  Latest
                </span>
              )}
              {prereleaseType && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-linear-to-b from-[#03BCF1] to-[#127FE5] text-white rounded-full">
                  <Icon icon="ri:moon-fill" className="text-xs" />
                  {prereleaseType}
                </span>
              )}
              {buildNumber && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full">
                  #{buildNumber}
                </span>
              )}
            </div>

            {diffUrl && (
              <a
                href={diffUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
              >
                <Icon icon="mdi:github" className="text-base" />
                View Diff
              </a>
            )}
          </div>

          <article className="mt-12 prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-pre:prose-code:bg-transparent prose-pre:prose-code:border-0 prose-pre:prose-code:p-0 prose-img:rounded-lg prose-img:border prose-img:border-neutral-200 prose-img:my-6 max-w-none">
            <MDXContent
              code={changelog.mdx}
              components={defaultMDXComponents}
            />
          </article>
        </div>
      </div>
    </main>
  );
}
