import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import semver from "semver";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { useIsMobile } from "@hypr/ui/hooks/use-mobile";
import { cn } from "@hypr/utils";

import {
  type ChangelogWithMeta,
  getChangelogBySlug,
  getChangelogList,
} from "@/changelog";
import { defaultMDXComponents } from "@/components/mdx";
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
        <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-stone-600 mb-6">
          Version {changelog.version}
        </h1>
        <DownloadButtons version={changelog.version} />
      </div>
    </div>
  );
}

function DownloadButtons({ version }: { version: string }) {
  const isNightly = version.includes("-nightly");
  const channel = isNightly ? "nightly" : "stable";
  const baseUrl = `https://desktop2.hyprnote.com/download/${version}`;
  const [isOpen, setIsOpen] = useState(false);
  const [detectedOS, setDetectedOS] = useState<
    "apple-silicon" | "apple-intel" | "linux-appimage" | "linux-deb"
  >("apple-silicon");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mac")) {
      setDetectedOS("apple-silicon");
    } else if (userAgent.includes("linux")) {
      setDetectedOS("linux-appimage");
    }
  }, []);

  const platforms = [
    {
      id: "apple-silicon" as const,
      icon: "ri:apple-fill",
      label: "Apple Silicon",
      url: `${baseUrl}/dmg-aarch64?channel=${channel}`,
    },
    {
      id: "apple-intel" as const,
      icon: "ri:apple-fill",
      label: "Intel Mac",
      url: `${baseUrl}/dmg-x86_64?channel=${channel}`,
    },
    {
      id: "linux-appimage" as const,
      icon: "simple-icons:linux",
      label: "Linux (AppImage)",
      url: `${baseUrl}/appimage-x86_64?channel=${channel}`,
    },
    {
      id: "linux-deb" as const,
      icon: "simple-icons:linux",
      label: "Linux (.deb)",
      url: `${baseUrl}/deb-x86_64?channel=${channel}`,
    },
  ];

  const primaryPlatform =
    platforms.find((p) => p.id === detectedOS) || platforms[0];
  const otherPlatforms = platforms.filter((p) => p.id !== detectedOS);

  return (
    <div className="relative inline-block mt-6">
      <div className="flex items-center bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all overflow-hidden">
        <a
          download
          href={primaryPlatform.url}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium"
        >
          <Icon icon={primaryPlatform.icon} className="text-base" />
          <span>Download for {primaryPlatform.label}</span>
        </a>
        <div className="w-px h-7 bg-stone-400/50" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="cursor-pointer px-3 pl-2.5 pr-3"
          aria-label="Show other platforms"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute top-full mt-2 right-0 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {otherPlatforms.map((platform) => (
                <a
                  key={platform.id}
                  download
                  href={platform.url}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0"
                >
                  <Icon
                    icon={platform.icon}
                    className="text-base text-stone-600"
                  />
                  <span className="text-sm font-medium text-stone-700">
                    {platform.label}
                  </span>
                </a>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto">
        <MockWindow
          title={isMobile ? undefined : `Version ${changelog.version}`}
          className="rounded-lg w-full max-w-none"
          prefixIcons={
            isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-1 hover:bg-neutral-200 rounded transition-colors"
                aria-label="Open version list"
              >
                <Menu className="w-4 h-4 text-neutral-600" />
              </button>
            )
          }
        >
          <div className="h-[600px] relative">
            {isMobile ? (
              <>
                <MobileSidebarDrawer
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  changelog={changelog}
                  allChangelogs={allChangelogs}
                />
                <ChangelogContent changelog={changelog} />
              </>
            ) : (
              <ChangelogSplitView
                changelog={changelog}
                allChangelogs={allChangelogs}
              />
            )}
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

function MobileSidebarDrawer({
  open,
  onClose,
  changelog,
  allChangelogs,
}: {
  open: boolean;
  onClose: () => void;
  changelog: ChangelogWithMeta;
  allChangelogs: ChangelogWithMeta[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/20"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute left-0 top-0 bottom-0 z-50 w-72 bg-white border-r border-neutral-200 shadow-lg"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-stone-50">
              <span className="text-sm font-medium text-stone-600">
                All Versions
              </span>
              <button
                onClick={onClose}
                className="p-1 hover:bg-neutral-200 rounded transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
            <div className="h-[calc(100%-49px)] overflow-hidden">
              <ChangelogSidebar
                changelog={changelog}
                allChangelogs={allChangelogs}
                onNavigate={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
  onNavigate,
}: {
  changelog: ChangelogWithMeta;
  allChangelogs: ChangelogWithMeta[];
  onNavigate?: () => void;
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
                    ? "/api/images/icons/nightly-icon.png"
                    : "/api/images/icons/stable-icon.png";

                  return (
                    <Link
                      key={version.slug}
                      to="/changelog/$slug"
                      params={{ slug: version.slug }}
                      onClick={onNavigate}
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
              <ChevronLeft className="w-4 h-4" />
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
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangelogContent({ changelog }: { changelog: ChangelogWithMeta }) {
  const { diffUrl } = Route.useLoaderData();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentVersion = semver.parse(changelog.version);
  const isPrerelease = currentVersion && currentVersion.prerelease.length > 0;
  const isLatest = changelog.newerSlug === null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [changelog.slug]);

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
        <div className="flex items-center gap-2">
          {diffUrl && (
            <a
              href={diffUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isMobile
                  ? "size-8 flex items-center justify-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
                  : "px-4 h-8 flex items-center gap-2 text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
              }
              title="View diff on GitHub"
            >
              <Icon icon="mdi:github" className="text-lg" />
              {!isMobile && <span>View Diff</span>}
            </a>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto">
        <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2 prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-pre:prose-code:bg-transparent prose-pre:prose-code:border-0 prose-pre:prose-code:p-0 prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-6 max-w-none">
          <MDXContent code={changelog.mdx} components={defaultMDXComponents} />
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
