import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
  useRouterState,
} from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { createContext, useContext, useMemo, useState } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { DocsDrawerContext } from "@/hooks/use-docs-drawer";

import { docsStructure } from "./docs/structure";

export const Route = createFileRoute("/_view")({
  component: Component,
});

interface HeroContextType {
  onTrigger: (() => void) | null;
  setOnTrigger: (callback: () => void) => void;
}

const HeroContext = createContext<HeroContextType | null>(null);

export function useHeroContext() {
  return useContext(HeroContext);
}

function Component() {
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");
  const [onTrigger, setOnTrigger] = useState<(() => void) | null>(null);
  const [isDocsDrawerOpen, setIsDocsDrawerOpen] = useState(false);

  return (
    <HeroContext.Provider
      value={{
        onTrigger,
        setOnTrigger: (callback) => setOnTrigger(() => callback),
      }}
    >
      <DocsDrawerContext.Provider
        value={{ isOpen: isDocsDrawerOpen, setIsOpen: setIsDocsDrawerOpen }}
      >
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          {!isDocsPage && <Footer />}
          {isDocsPage && (
            <MobileDocsDrawer
              isOpen={isDocsDrawerOpen}
              onClose={() => setIsDocsDrawerOpen(false)}
            />
          )}
        </div>
      </DocsDrawerContext.Provider>
    </HeroContext.Provider>
  );
}

function MobileDocsDrawer({
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

  return (
    <div
      className={`fixed top-[69px] left-0 h-[calc(100vh-69px)] w-72 bg-white border-r border-neutral-100 shadow-2xl shadow-neutral-900/20 z-50 md:hidden transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full overflow-y-auto p-4">
        <DocsNavigation
          sections={docsBySection.sections}
          currentSlug={currentSlug}
          onLinkClick={onClose}
        />
      </div>
    </div>
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
