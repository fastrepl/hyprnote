import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { useMemo } from "react";

export const Route = createFileRoute("/_view/docs")({
  component: Component,
});

function Component() {
  return (
    <div className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <LeftSidebar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function LeftSidebar() {
  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: "/docs/$slug", fuzzy: true });

  const currentSlug = (match && typeof match !== "boolean" ? match.slug : undefined) as string | undefined;

  const docsBySection = useMemo(() => {
    const grouped = allDocs.reduce((acc, doc) => {
      if (!acc[doc.sectionFolder]) {
        acc[doc.sectionFolder] = {
          title: "",
          docs: [],
          indexDoc: null as typeof doc | null,
        };
      }

      if (doc.isIndex) {
        acc[doc.sectionFolder].indexDoc = doc;
        acc[doc.sectionFolder].title = doc.title;
      } else {
        acc[doc.sectionFolder].docs.push(doc);
      }

      return acc;
    }, {} as Record<string, { title: string; docs: typeof allDocs; indexDoc: typeof allDocs[0] | null }>);

    Object.keys(grouped).forEach(folder => {
      if (!grouped[folder].title) {
        grouped[folder].title = folder
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    });

    return Object.values(grouped).sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  return (
    <aside className="hidden lg:block lg:col-span-3">
      <div className="sticky top-[65px] max-h-[calc(100vh-65px)] overflow-y-auto space-y-6 px-4 py-6">
        <nav className="space-y-4">
          {docsBySection.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 text-sm font-semibold text-neutral-700 mb-2">
                {section.indexDoc
                  ? (
                    <Link
                      to="/docs/$slug"
                      params={{ slug: section.indexDoc.slug }}
                      className="hover:text-stone-600 transition-colors"
                    >
                      {section.title}
                    </Link>
                  )
                  : (
                    section.title
                  )}
              </h3>
              <div className="space-y-0.5">
                {section.docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    to="/docs/$slug"
                    params={{ slug: doc.slug }}
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
      </div>
    </aside>
  );
}
