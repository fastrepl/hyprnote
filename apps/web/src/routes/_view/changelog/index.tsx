import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import semver from "semver";

import { type ChangelogWithMeta, getChangelogList } from "@/changelog";
import { MockWindow } from "@/components/mock-window";

export const Route = createFileRoute("/_view/changelog/")({
  component: Component,
  loader: async () => {
    const changelogs = getChangelogList();
    return { changelogs };
  },
  head: () => ({
    meta: [
      { title: "Changelog - Hyprnote Changelog" },
      {
        name: "description",
        content: "Track every update, improvement, and fix to Hyprnote",
      },
      { property: "og:title", content: "Changelog - Hyprnote Changelog" },
      {
        property: "og:description",
        content: "Track every update, improvement, and fix to Hyprnote",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/changelog" },
    ],
  }),
});

type SemanticVersionGroup = {
  baseVersion: string;
  versions: ChangelogWithMeta[];
};

function groupBySemanticVersion(
  changelogs: ChangelogWithMeta[],
): SemanticVersionGroup[] {
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
      versions,
    }))
    .sort((a, b) => semver.rcompare(a.baseVersion, b.baseVersion));
}

function Component() {
  const { changelogs } = Route.useLoaderData();
  const groups = groupBySemanticVersion(changelogs);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <ChangelogContentSection groups={groups} />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="px-6 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          Changelog
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Track every update, improvement, and fix to Hyprnote
        </p>
      </div>
    </div>
  );
}

function ChangelogContentSection({
  groups,
}: {
  groups: SemanticVersionGroup[];
}) {
  return (
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto">
        <MockWindow title="Changelog" className="rounded-lg w-full max-w-none">
          <div className="h-[480px] overflow-y-auto">
            <ChangelogGridView groups={groups} />
          </div>
          <ChangelogStatusBar groups={groups} />
        </MockWindow>
      </div>
    </section>
  );
}

function ChangelogGridView({ groups }: { groups: SemanticVersionGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="mb-6">
          <Icon
            icon="mdi:clipboard-text-outline"
            className="text-6xl text-neutral-300"
          />
        </div>
        <p className="text-neutral-500">No releases yet. Stay tuned!</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {groups.map((group, index) => (
        <VersionGroup
          key={group.baseVersion}
          group={group}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}

function VersionGroup({
  group,
  isFirst,
}: {
  group: SemanticVersionGroup;
  isFirst: boolean;
}) {
  return (
    <div className={isFirst ? "mb-8" : "mb-8 border-t border-neutral-100 pt-8"}>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Version {group.baseVersion}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {group.versions.map((changelog) => (
          <VersionIcon key={changelog.slug} changelog={changelog} />
        ))}
      </div>
    </div>
  );
}

function VersionIcon({ changelog }: { changelog: ChangelogWithMeta }) {
  const version = semver.parse(changelog.version);
  const isPrerelease = version && version.prerelease.length > 0;
  const iconUrl = isPrerelease
    ? "/api/images/icons/nightly-icon.png"
    : "/api/images/icons/stable-icon.png";

  return (
    <Link
      to="/changelog/$slug"
      params={{ slug: changelog.slug }}
      className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
    >
      <div className="mb-3 w-16 h-16 flex items-center justify-center">
        <img
          src={iconUrl}
          alt={`Version ${changelog.version}`}
          width={64}
          height={64}
          className="w-16 h-16 group-hover:scale-110 transition-transform"
        />
      </div>
      <div className="font-medium text-stone-600 text-sm">
        v{changelog.version}
      </div>
    </Link>
  );
}

function ChangelogStatusBar({ groups }: { groups: SemanticVersionGroup[] }) {
  const totalVersions = groups.reduce(
    (sum, group) => sum + group.versions.length,
    0,
  );

  return (
    <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
      <span className="text-xs text-neutral-500">
        {totalVersions} {totalVersions === 1 ? "version" : "versions"},{" "}
        {groups.length} {groups.length === 1 ? "group" : "groups"}
      </span>
    </div>
  );
}
