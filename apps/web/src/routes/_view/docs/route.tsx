import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { useMemo } from "react";

import { DocsSearch } from "@/components/docs-search";

import { docsStructure } from "./-structure";

export const Route = createFileRoute("/_view/docs")({
  component: Component,
});

function Component() {
  return (
    <div className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex gap-8">
          <LeftSidebar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function LeftSidebar() {
  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: "/docs/$", fuzzy: true });

  const currentSlug = (
    match && typeof match !== "boolean" ? match._splat : undefined
  ) as string | undefined;

  const docsBySection = useMemo(() => {
    const sectionGroups: Record<
      string,
      { title: string; docs: (typeof allDocs)[0][] }
    > = {};

    allDocs.forEach((doc) => {
      if (doc.slug === "index" || doc.isIndex) {
        return;
      }

      const sectionName = doc.section;

      if (!sectionGroups[sectionName]) {
        sectionGroups[sectionName] = {
          title: sectionName,
          docs: [],
        };
      }

      sectionGroups[sectionName].docs.push(doc);
    });

    Object.keys(sectionGroups).forEach((sectionName) => {
      sectionGroups[sectionName].docs.sort((a, b) => a.order - b.order);
    });

    const sections = docsStructure.sections
      .map((sectionId) => {
        return Object.values(sectionGroups).find(
          (group) => group.title.toLowerCase() === sectionId.toLowerCase(),
        );
      })
      .filter(
        (section): section is NonNullable<typeof section> =>
          section !== undefined,
      );

    return { sections };
  }, []);

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-[69px] max-h-[calc(100vh-69px)] overflow-y-auto scrollbar-hide space-y-6 px-4 py-6">
        <DocsSearch />
        <DocsNavigation
          sections={docsBySection.sections}
          currentSlug={currentSlug}
        />
      </div>
    </aside>
  );
}

function DocsNavigation({
  sections,
  currentSlug,
  onLinkClick,
}: {
  sections: { title: string; docs: (typeof allDocs)[0][] }[];
  currentSlug: string | undefined;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="px-3 text-sm font-semibold text-neutral-700 mb-2">
            {section.title}
          </h3>
          <div className="space-y-0.5">
            {section.docs.map((doc) => (
              <Link
                key={doc.slug}
                to="/docs/$"
                params={{ _splat: doc.slug }}
                onClick={onLinkClick}
                className={`block pl-5 pr-3 py-1.5 text-sm rounded-sm transition-colors ${
                  currentSlug === doc.slug
                    ? "bg-neutral-100 text-stone-600 font-medium"
                    : "text-neutral-600 hover:text-stone-600 hover:bg-neutral-50"
                }`}
              >
                {doc.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
