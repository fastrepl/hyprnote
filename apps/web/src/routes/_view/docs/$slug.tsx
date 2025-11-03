import { cn } from "@hypr/utils";

import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allDocs } from "content-collections";

import { CtaCard } from "@/components/cta-card";
import { Accordion, Card, Columns, Info, Note, Step, Steps, Tip } from "@hypr/ui/docs";

export const Route = createFileRoute("/_view/docs/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const doc = allDocs.find((doc) => doc.slug === params.slug);
    if (!doc) {
      throw notFound();
    }

    return { doc };
  },
  head: ({ loaderData }) => {
    const { doc } = loaderData!;
    const url = `https://hyprnote.com/docs/${doc.slug}`;

    return {
      meta: [
        { title: doc.title },
        { name: "description", content: doc.summary || doc.title },
        { property: "og:title", content: doc.title },
        { property: "og:description", content: doc.summary || doc.title },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: doc.title },
        { name: "twitter:description", content: doc.summary || doc.title },
      ],
    };
  },
});

function Component() {
  const { doc } = Route.useLoaderData();

  return (
    <>
      <main className="lg:col-span-6 xl:col-span-6 px-4 py-6">
        <ArticleHeader doc={doc} />
        <ArticleContent doc={doc} />
        <ArticleFooter />
      </main>

      <RightSidebar toc={doc.toc} />

      <MobileCTA />
    </>
  );
}

function ArticleHeader({ doc }: { doc: any }) {
  const sectionTitle = allDocs.find(d => d.sectionFolder === doc.sectionFolder && d.isIndex)?.title
    || doc.sectionFolder.split("-").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

  return (
    <header className="mb-8 lg:mb-12">
      <div className="inline-flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <span>{sectionTitle}</span>
      </div>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 mb-4">
        {doc.title}
      </h1>
      {doc.summary && (
        <p className="text-lg lg:text-xl text-neutral-600 leading-relaxed mb-6">
          {doc.summary}
        </p>
      )}

      {(doc.author || doc.created) && (
        <div className="flex items-center gap-4 text-sm text-neutral-500">
          {doc.author && <span>{doc.author}</span>}
          {doc.author && doc.created && <span>·</span>}
          {doc.created && (
            <time dateTime={doc.created}>
              {new Date(doc.created).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          {doc.updated && doc.updated !== doc.created && (
            <>
              <span>·</span>
              <span className="text-neutral-400">
                Updated {new Date(doc.updated).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function ArticleContent({ doc }: { doc: any }) {
  return (
    <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-4xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8 max-w-none">
      <MDXContent
        code={doc.mdx}
        components={{
          Accordion,
          Card,
          Columns,
          Info,
          Note,
          Step,
          Steps,
          Tip,
          CtaCard,
        }}
      />
    </article>
  );
}

function ArticleFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 pt-8 border-t border-neutral-100">
      <Link
        to="/docs"
        className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium mb-8"
      >
        <span>←</span>
        <span>Back to docs</span>
      </Link>

      <div className="mt-8 pt-8 border-t border-neutral-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-neutral-500">
          <div>
            <span>Fastrepl © {currentYear}</span>
            <span className="mx-2">·</span>
            <Link
              to="/legal/$slug"
              params={{ slug: "terms" }}
              className="hover:text-stone-600 transition-colors"
            >
              Terms
            </Link>
            <span className="mx-2">·</span>
            <Link
              to="/legal/$slug"
              params={{ slug: "privacy" }}
              className="hover:text-stone-600 transition-colors"
            >
              Privacy
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/fastrepl/hyprnote"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-600 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/hyprnote"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-600 transition-colors"
            >
              Discord
            </a>
            <a
              href="https://twitter.com/hyprnote"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-600 transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function RightSidebar({
  toc,
}: {
  toc: Array<{ id: string; text: string; level: number }>;
}) {
  return (
    <aside className="hidden lg:block lg:col-span-3">
      <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-6 px-4 py-6">
        {toc.length > 0 && (
          <nav className="space-y-1">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
              On this page
            </p>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  [
                    "block text-sm py-1 transition-colors border-l-2",
                    item.level === 3 && "pl-4",
                    item.level === 2 && "pl-2",
                    "border-transparent text-neutral-600 hover:text-stone-600 hover:border-neutral-300",
                  ],
                )}
              >
                {item.text}
              </a>
            ))}
          </nav>
        )}

        <div className="border border-neutral-200 rounded-sm overflow-hidden bg-white p-4">
          <h3 className="font-serif text-sm text-stone-600 mb-3">
            Questions about Hyprnote?
          </h3>
          <a
            href="/founders"
            target="_blank"
            rel="noopener noreferrer"
            className={cn([
              "group px-4 h-9 flex items-center justify-center text-sm w-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
              "hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Book a call
          </a>
        </div>
      </div>
    </aside>
  );
}

function MobileCTA() {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white/95 backdrop-blur-sm p-4 z-20">
      <a
        href="/founders"
        target="_blank"
        rel="noopener noreferrer"
        className={cn([
          "group px-4 h-12 flex items-center justify-center text-base w-full",
          "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
          "hover:scale-[102%] active:scale-[98%]",
          "transition-all",
        ])}
      >
        Book a call with us
        <Icon icon="mdi:calendar" className="ml-2 text-xl" />
      </a>
    </div>
  );
}
