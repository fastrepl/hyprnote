import { cn } from "@hypr/utils";

import { MDXContent } from "@content-collections/mdx/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { allArticles } from "content-collections";
import { useState } from "react";

import { CtaCard } from "@/components/cta-card";

export const Route = createFileRoute("/_view/blog/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const article = allArticles.find((article) => article.slug === params.slug);
    if (!article) {
      throw notFound();
    }

    const relatedArticles = allArticles
      .filter((a) => a.slug !== article.slug)
      .sort((a, b) => {
        const aScore = a.author === article.author ? 1 : 0;
        const bScore = b.author === article.author ? 1 : 0;
        if (aScore !== bScore) {
          return bScore - aScore;
        }

        const aDate = a.updated || a.created;
        const bDate = b.updated || b.created;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })
      .slice(0, 3);

    return { article, relatedArticles };
  },
  head: ({ loaderData }) => {
    const { article } = loaderData!;
    const url = `https://hyprnote.com/blog/${article.slug}`;

    return {
      meta: [
        { title: article.title },
        { name: "description", content: article.summary },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.summary },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: `https://hyprnote.com${article.coverImage}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: article.summary },
        { name: "twitter:image", content: `https://hyprnote.com${article.coverImage}` },
        ...(article.author ? [{ name: "author", content: article.author }] : []),
        { property: "article:published_time", content: article.created },
        ...(article.updated ? [{ property: "article:modified_time", content: article.updated }] : []),
      ],
    };
  },
});

function Component() {
  const { article, relatedArticles } = Route.useLoaderData();
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);

  const hasCoverImage = !coverImageError;

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="min-h-screen max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <MobileHeader />

        <div className="sm:grid sm:grid-cols-12 sm:gap-8">
          <TableOfContents toc={article.toc} />

          <main className="sm:col-span-8 lg:col-span-6 py-4">
            <CoverImage
              article={article}
              hasCoverImage={hasCoverImage}
              coverImageLoaded={coverImageLoaded}
              onLoad={() => setCoverImageLoaded(true)}
              onError={() => setCoverImageError(true)}
            />
            <ArticleHeader article={article} />
            <ArticleContent article={article} />
            <RelatedArticlesMobile relatedArticles={relatedArticles} />
            <ArticleFooter />
          </main>

          <RightSidebar relatedArticles={relatedArticles} />
        </div>

        <MobileCTA />
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="lg:hidden border-b border-neutral-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="px-4 py-4">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors"
        >
          <span>←</span>
          <span>Back to blog</span>
        </Link>
      </div>
    </div>
  );
}

function TableOfContents({
  toc,
}: {
  toc: Array<{ id: string; text: string; level: number }>;
}) {
  return (
    <aside className="hidden lg:block lg:col-span-3">
      <div className="sticky top-[65px] max-h-[calc(100vh-65px)] overflow-y-auto p-4">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors mb-8"
        >
          <span>←</span>
          <span>Back to blog</span>
        </Link>

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
      </div>
    </aside>
  );
}

function ArticleHeader({ article }: { article: any }) {
  return (
    <header className="mb-8 lg:mb-12">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 mb-4">
        {article.title}
      </h1>
      <p className="text-lg lg:text-xl text-neutral-600 leading-relaxed mb-6">
        {article.summary}
      </p>

      <div className="flex items-center gap-4 text-sm text-neutral-500">
        {article.author && <span>{article.author}</span>}
        {article.author && <span>·</span>}
        <time dateTime={article.created}>
          {new Date(article.created).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        {article.updated && article.updated !== article.created && (
          <>
            <span>·</span>
            <span className="text-neutral-400">
              Updated {new Date(article.updated).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </>
        )}
      </div>
    </header>
  );
}

function CoverImage({
  article,
  hasCoverImage,
  coverImageLoaded,
  onLoad,
  onError,
}: {
  article: any;
  hasCoverImage: boolean;
  coverImageLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  if (!hasCoverImage) {
    return null;
  }

  return (
    <div className="mb-8 lg:mb-12 -mx-4 sm:mx-0">
      <img
        src={article.coverImage}
        alt={article.title}
        width={1200}
        height={630}
        className={cn(
          [
            "w-full aspect-40/21 object-cover rounded-none sm:rounded-sm border-y sm:border border-neutral-200 transition-opacity duration-300",
            coverImageLoaded ? "opacity-100" : "opacity-0",
          ],
        )}
        onLoad={onLoad}
        onError={onError}
        loading="eager"
      />
    </div>
  );
}

function ArticleContent({ article }: { article: any }) {
  return (
    <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-4xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8 max-w-none">
      <MDXContent
        code={article.mdx}
        components={{
          CtaCard,
        }}
      />
    </article>
  );
}

function RelatedArticlesMobile({ relatedArticles }: { relatedArticles: any[] }) {
  if (relatedArticles.length === 0) {
    return null;
  }

  return (
    <div className="sm:hidden mt-16 pt-8 border-t border-neutral-100">
      <h3 className="text-xl font-serif text-stone-600 mb-6">More articles</h3>
      <div className="space-y-4">
        {relatedArticles.map((related) => <RelatedArticleCard key={related.slug} article={related} compact />)}
      </div>
    </div>
  );
}

function ArticleFooter() {
  return (
    <footer className="mt-16 pt-8 border-t border-neutral-100">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium"
      >
        <span>←</span>
        <span>View all articles</span>
      </Link>
    </footer>
  );
}

function RightSidebar({ relatedArticles }: { relatedArticles: any[] }) {
  return (
    <aside className="hidden sm:block sm:col-span-4 lg:col-span-3">
      <div className="sticky top-[65px] space-y-8 p-4">
        {relatedArticles.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
              More articles
            </h3>
            <div className="space-y-4">
              {relatedArticles.map((related) => <RelatedArticleCard key={related.slug} article={related} />)}
            </div>
          </div>
        )}

        <div className="border border-neutral-200 rounded-sm overflow-hidden bg-white p-4">
          <h3 className="font-serif text-base text-stone-600 mb-4">
            Learn more about Hyprnote directly from the founders
          </h3>
          <a
            href="https://cal.com/team/hyprnote/welcome"
            target="_blank"
            rel="noopener noreferrer"
            className={cn([
              "group px-4 h-10 flex items-center justify-center text-sm w-full",
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
    <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white/95 backdrop-blur-sm p-4 z-20">
      <a
        href="https://cal.com/team/hyprnote/welcome"
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      </a>
    </div>
  );
}

function RelatedArticleCard({ article, compact = false }: { article: any; compact?: boolean }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className="group block p-4 border border-neutral-100 rounded-sm hover:border-neutral-200 hover:shadow-sm transition-all bg-white"
    >
      <h4 className="font-serif text-sm text-stone-600 group-hover:text-stone-800 transition-colors line-clamp-2 mb-2">
        {article.title}
      </h4>
      {!compact && <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{article.summary}</p>}
      <time
        dateTime={article.updated || article.created}
        className="text-xs text-neutral-400"
      >
        {new Date(article.updated || article.created).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </time>
    </Link>
  );
}
