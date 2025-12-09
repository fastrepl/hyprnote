import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { SearchTrigger } from "@/components/search";
import { SidebarNavigation } from "@/components/sidebar-navigation";

import { getDocsBySection } from "./-structure";

export const Route = createFileRoute("/_view/docs")({
  component: Component,
});

function Component() {
  return (
    <div className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]">
      <MobileSearchBar />
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex gap-8">
          <LeftSidebar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function MobileSearchBar() {
  return (
    <div className="sticky top-[69px] z-40 md:hidden bg-white/80 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <SearchTrigger variant="mobile" />
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
        <SearchTrigger variant="sidebar" />
        <SidebarNavigation
          sections={sections}
          currentSlug={currentSlug}
          scrollContainerRef={scrollContainerRef}
          linkTo="/docs/$"
        />
      </div>
    </aside>
  );
}
