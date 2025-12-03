import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { allHandbooks } from "content-collections";
import { useEffect, useMemo, useRef, useState } from "react";

import { BottomSheet, BottomSheetContent } from "@hypr/ui/bottom-sheet";
import { cn } from "@hypr/utils";

import { handbookStructure } from "./-structure";

export const Route = createFileRoute("/_view/company-handbook")({
  component: Component,
});

function Component() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <MobileMenuButton onClick={() => setIsMobileMenuOpen(true)} />
        <div className="flex gap-8">
          <LeftSidebar />
          <Outlet />
        </div>
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>
    </div>
  );
}

function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "md:hidden fixed bottom-4 right-4 z-30",
        "w-14 h-14 rounded-full",
        "bg-stone-600 text-white shadow-lg",
        "flex items-center justify-center",
        "hover:bg-stone-700 active:scale-95",
        "transition-all",
      ])}
      aria-label="Open navigation menu"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

function LeftSidebar() {
  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: "/company-handbook/$", fuzzy: true });

  const currentSlug = (
    match && typeof match !== "boolean" ? match._splat : undefined
  ) as string | undefined;

  const handbooksBySection = useMemo(() => {
    const sectionGroups: Record<
      string,
      { title: string; docs: (typeof allHandbooks)[0][] }
    > = {};

    allHandbooks.forEach((doc) => {
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

    const sections = handbookStructure.sections
      .map((sectionId) => {
        const sectionName =
          sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        return sectionGroups[sectionName];
      })
      .filter(Boolean);

    return { sections };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div
        ref={scrollContainerRef}
        className="sticky top-[69px] max-h-[calc(100vh-69px)] overflow-y-auto scrollbar-hide space-y-6 px-4 py-6"
      >
        <HandbookNavigation
          sections={handbooksBySection.sections}
          currentSlug={currentSlug}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </aside>
  );
}

function MobileMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: "/company-handbook/$", fuzzy: true });

  const currentSlug = (
    match && typeof match !== "boolean" ? match._splat : undefined
  ) as string | undefined;

  const handbooksBySection = useMemo(() => {
    const sectionGroups: Record<
      string,
      { title: string; docs: (typeof allHandbooks)[0][] }
    > = {};

    allHandbooks.forEach((doc) => {
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

    const sections = handbookStructure.sections
      .map((sectionId) => {
        const sectionName =
          sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
        return sectionGroups[sectionName];
      })
      .filter(Boolean);

    return { sections };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <BottomSheet open={isOpen} onClose={onClose}>
      <BottomSheetContent
        className={cn([
          "bg-white max-h-[80vh] overflow-y-auto",
          "px-4 py-6",
        ])}
      >
        <div ref={scrollContainerRef} className="overflow-y-auto">
          <HandbookNavigation
            sections={handbooksBySection.sections}
            currentSlug={currentSlug}
            onLinkClick={onClose}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function HandbookNavigation({
  sections,
  currentSlug,
  onLinkClick,
  scrollContainerRef,
}: {
  sections: { title: string; docs: (typeof allHandbooks)[0][] }[];
  currentSlug: string | undefined;
  onLinkClick?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeLinkRef.current && scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      const activeLink = activeLinkRef.current;

      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        const scrollTop =
          activeLink.offsetTop -
          container.offsetTop -
          containerRect.height / 2 +
          linkRect.height / 2;

        container.scrollTop = scrollTop;
      });
    }
  }, [currentSlug, scrollContainerRef]);

  return (
    <nav className="space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="px-3 text-sm font-semibold text-neutral-700 mb-2">
            {section.title}
          </h3>
          <div className="space-y-0.5">
            {section.docs.map((doc) => {
              const isActive = currentSlug === doc.slug;
              return (
                <Link
                  key={doc.slug}
                  to="/company-handbook/$"
                  params={{ _splat: doc.slug }}
                  onClick={onLinkClick}
                  ref={isActive ? activeLinkRef : undefined}
                  className={`block pl-5 pr-3 py-1.5 text-sm rounded-sm transition-colors ${
                    isActive
                      ? "bg-neutral-100 text-stone-600 font-medium"
                      : "text-neutral-600 hover:text-stone-600 hover:bg-neutral-50"
                  }`}
                >
                  {doc.title}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
