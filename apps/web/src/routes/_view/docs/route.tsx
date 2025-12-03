import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { useEffect, useRef } from "react";

import { getDocsBySection } from "./-structure";

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

  const { sections } = getDocsBySection();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div
        ref={scrollContainerRef}
        className="sticky top-[69px] max-h-[calc(100vh-69px)] overflow-y-auto scrollbar-hide space-y-6 px-4 py-6"
      >
        <DocsNavigation
          sections={sections}
          currentSlug={currentSlug}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </aside>
  );
}

function DocsNavigation({
  sections,
  currentSlug,
  onLinkClick,
  scrollContainerRef,
}: {
  sections: { title: string; docs: (typeof allDocs)[0][] }[];
  currentSlug: string | undefined;
  onLinkClick?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}) {
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeLinkRef.current && scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      const activeLink = activeLinkRef.current;

      const containerRect = container.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();

      const scrollTop =
        activeLink.offsetTop -
        container.offsetTop -
        containerRect.height / 2 +
        linkRect.height / 2;

      container.scrollTop = scrollTop;
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
                  to="/docs/$"
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
