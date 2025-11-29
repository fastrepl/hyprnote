import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { X } from "lucide-react";
import { useMemo } from "react";

import { useDocsDrawer } from "@/hooks/use-docs-drawer";

import { docsStructure } from "./structure";

export const Route = createFileRoute("/_view/docs")({
  component: Component,
});

function Component() {
  const docsDrawer = useDocsDrawer();

  return (
    <>
      <div className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]">
        <div className="max-w-6xl mx-auto border-x border-neutral-100">
          <div className="flex gap-8">
            <LeftSidebar />
            <Outlet />
          </div>
        </div>
      </div>
      {docsDrawer && (
        <MobileDrawer
          isOpen={docsDrawer.isOpen}
          onClose={() => docsDrawer.setIsOpen(false)}
        />
      )}
    </>
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
        const sectionName =
          sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        return sectionGroups[sectionName];
      })
      .filter(Boolean);

    return { sections };
  }, []);

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-[69px] max-h-[calc(100vh-69px)] overflow-y-auto scrollbar-hide space-y-6 px-4 py-6">
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
                className={`block px-3 py-1.5 text-sm rounded-sm transition-colors ${
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

function MobileDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
        const sectionName =
          sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        return sectionGroups[sectionName];
      })
      .filter(Boolean);

    return { sections };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-neutral-100 shadow-lg z-50 md:hidden animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between h-[69px] px-4 border-b border-neutral-100">
          <span className="font-semibold text-neutral-700">Documentation</span>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-69px)] px-4 py-6">
          <DocsNavigation
            sections={docsBySection.sections}
            currentSlug={currentSlug}
            onLinkClick={onClose}
          />
        </div>
      </div>
    </>
  );
}
