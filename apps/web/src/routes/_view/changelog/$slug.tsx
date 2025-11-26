import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import semver from "semver";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { cn } from "@hypr/utils";

import {
  type ChangelogWithMeta,
  getChangelogBySlug,
  getChangelogList,
} from "@/changelog";
import { Mermaid, Tweet } from "@/components/mdx";
import { MockWindow } from "@/components/mock-window";

const ITEMS_PER_PAGE = 20;

type VersionGroup = {
  baseVersion: string;
  versions: ChangelogWithMeta[];
};

export const Route = createFileRoute("/_view/changelog/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const changelog = getChangelogBySlug(params.slug);
    if (!changelog) {
      throw notFound();
    }

    const allChangelogs = getChangelogList();

    const nextChangelog = changelog.newerSlug
      ? (getChangelogBySlug(changelog.newerSlug) ?? null)
      : null;
    const prevChangelog = changelog.olderSlug
      ? (getChangelogBySlug(changelog.olderSlug) ?? null)
      : null;

    const beforeVersion = changelog.beforeVersion;
    const diffUrl =
      beforeVersion != null
        ? `https://github.com/fastrepl/hyprnote/compare/desktop_v${beforeVersion}...desktop_v${changelog.version}`
        : null;

    return {
      changelog,
      allChangelogs,
      nextChangelog,
      prevChangelog,
      diffUrl,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const { changelog } = loaderData;
    const currentVersion = semver.parse(changelog.version);
    const isNightly = currentVersion && currentVersion.prerelease.length > 0;

    const title = `Hyprnote Changelog - Version ${changelog.version}`;
    const description = `Explore what's new in Hyprnote version ${changelog.version}${isNightly ? " (Nightly)" : ""}.`;
    const url = `https://hyprnote.com/changelog/${changelog.slug}`;
    const ogImageUrl = `https://hyprnote.com/og?type=changelog&version=${encodeURIComponent(changelog.version)}`;

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
  const { changelog, allChangelogs } = Route.useLoaderData();

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection changelog={changelog} />
        <ChangelogContentSection
          changelog={changelog}
          allChangelogs={allChangelogs}
        />
      </div>
    </div>
  );
}

function HeroSection({ changelog }: { changelog: ChangelogWithMeta }) {
  return (
    <div className="px-6 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          Version {changelog.version}
        </h1>
      </div>
    </div>
  );
}

function ChangelogContentSection({
  changelog,
  allChangelogs,
}: {
  changelog: ChangelogWithMeta;
  allChangelogs: ChangelogWithMeta[];
}) {
  return (
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto">
        <MockWindow
          title={`Version ${changelog.version}`}
          className="rounded-lg w-full max-w-none"
        >
          <div className="h-[600px]">
            <ChangelogSplitView
              changelog={changelog}
              allChangelogs={allChangelogs}
            />
          </div>
          <ChangelogStatusBar changelog={changelog} />
        </MockWindow>
      </div>
    </section>
  );
}

function ChangelogSplitView({
  changelog,
  allChangelogs,
}: {
  changelog: ChangelogWithMeta;
  allChangelogs: ChangelogWithMeta[];
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-[600px]">
      <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
        <ChangelogSidebar changelog={changelog} allChangelogs={allChangelogs} />
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-neutral-200 w-px" />
      <ResizablePanel defaultSize={65}>
        <ChangelogContent changelog={changelog} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function groupVersions(changelogs: ChangelogWithMeta[]): VersionGroup[] {
  const groups = new Map<string, ChangelogWithMeta[]>();

  for (const changelog of changelogs) {
    const version = semver.parse(changelog.version);
    if (version) {
      const baseVersion = `${version.major}.${version.minor}.${version.patch}`;
      if (!groups.has(baseVersion)) {
        groups.set(baseVersion, []);
      }
      groups.get(baseVersion)!.push(changelog);
    }
  }

  return Array.from(groups.entries())
    .map(([baseVersion, versions]) => ({
      baseVersion,
      versions: versions.sort((a, b) => semver.rcompare(a.version, b.version)),
    }))
    .sort((a, b) => semver.rcompare(a.baseVersion, b.baseVersion));
}

function ChangelogSidebar({
  changelog,
  allChangelogs,
}: {
  changelog: ChangelogWithMeta;
  allChangelogs: ChangelogWithMeta[];
}) {
  const [currentPage, setCurrentPage] = useState(0);

  const versionGroups = groupVersions(allChangelogs);
  const totalPages = Math.ceil(versionGroups.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedGroups = versionGroups.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {paginatedGroups.map((group) => (
            <div key={group.baseVersion}>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-2">
                Version {group.baseVersion}
              </div>
              <div className="space-y-2">
                {group.versions.map((version) => {
                  const v = semver.parse(version.version);
                  const isPrerelease = v && v.prerelease.length > 0;
                  const iconUrl = isPrerelease
                    ? "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/nightly-icon.png"
                    : "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/stable-icon.png";

                  return (
                    <Link
                      key={version.slug}
                      to="/changelog/$slug"
                      params={{ slug: version.slug }}
                      className={cn([
                        "bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors flex items-center gap-3",
                        version.slug === changelog.slug
                          ? "border-stone-600 bg-stone-100"
                          : "border-neutral-200",
                      ])}
                    >
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                        <img
                          src={iconUrl}
                          alt={`Version ${version.version}`}
                          width={40}
                          height={40}
                          className="w-10 h-10"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-600 truncate">
                          v{version.version}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {isPrerelease ? "Nightly" : "Stable"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 p-3 bg-stone-50">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className={cn([
                "px-3 py-1.5 text-xs rounded-full border transition-colors",
                currentPage === 0
                  ? "border-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "border-neutral-300 text-stone-600 hover:bg-stone-100 cursor-pointer",
              ])}
            >
              <Icon icon="mdi:chevron-left" className="text-base" />
            </button>

            <span className="text-xs text-neutral-500">
              Page {currentPage + 1} of {totalPages}
            </span>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              className={cn([
                "px-3 py-1.5 text-xs rounded-full border transition-colors",
                currentPage === totalPages - 1
                  ? "border-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "border-neutral-300 text-stone-600 hover:bg-stone-100 cursor-pointer",
              ])}
            >
              <Icon icon="mdi:chevron-right" className="text-base" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangelogContent({ changelog }: { changelog: ChangelogWithMeta }) {
  const { diffUrl } = Route.useLoaderData();
  const currentVersion = semver.parse(changelog.version);
  const isPrerelease = currentVersion && currentVersion.prerelease.length > 0;
  const isLatest = changelog.newerSlug === null;

  // Parse prerelease info
  let prereleaseType = "";
  let buildNumber = "";
  if (isPrerelease && currentVersion && currentVersion.prerelease.length > 0) {
    prereleaseType = currentVersion.prerelease[0]?.toString() || "";
    buildNumber = currentVersion.prerelease[1]?.toString() || "";
  }

  const baseVersion = currentVersion
    ? `v${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`
    : `v${changelog.version}`;

  return (
    <div className="h-full flex flex-col">
      <div className="h-[58px] px-4 flex items-center justify-between border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-stone-600">{baseVersion}</h2>
          {isLatest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-stone-100 text-stone-700 rounded-full">
              <Icon icon="mdi:star" className="text-sm" />
              Latest
            </span>
          )}
          {prereleaseType && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              {prereleaseType}
            </span>
          )}
          {buildNumber && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-full">
              #{buildNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {diffUrl && (
            <a
              href={diffUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 h-8 flex items-center gap-2 text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
              title="View diff on GitHub"
            >
              <Icon icon="mdi:github" className="text-base" />
              <span>View Diff</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2 prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-6 max-w-none">
          <MDXContent code={changelog.mdx} components={{ Mermaid, Tweet }} />
        </article>
      </div>
    </div>
  );
}

function ChangelogStatusBar({ changelog }: { changelog: ChangelogWithMeta }) {
  const { allChangelogs } = Route.useLoaderData();

  return (
    <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
      <span className="text-xs text-neutral-500">
        Viewing v{changelog.version} • {allChangelogs.length} total versions
      </span>
    </div>
  );
}
