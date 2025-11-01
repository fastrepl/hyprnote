import { cn } from "@hypr/utils";

import { createFileRoute, Link } from "@tanstack/react-router";
import { allArticles, type Article } from "content-collections";
import { useState } from "react";

export const Route = createFileRoute("/_view/blog/")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Blog - Hyprnote" },
      { name: "description", content: "Insights, updates, and stories from the Hyprnote team" },
      { property: "og:title", content: "Blog - Hyprnote" },
      { property: "og:description", content: "Insights, updates, and stories from the Hyprnote team" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/blog" },
    ],
  }),
});

function Component() {
  const sortedArticles = [...allArticles].sort((a, b) => {
    const aDate = a.updated || a.created;
    const bDate = b.updated || b.created;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const featuredArticles = sortedArticles.filter((a) => a.featured);
  const regularArticles = sortedArticles.filter((a) => !a.featured);

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-stone-50/20 to-white">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="px-4 sm:px-6 lg:px-8 py-16">
          <Header />
          <FeaturedSection articles={featuredArticles} />
          <AllArticlesSection
            featuredArticles={featuredArticles}
            regularArticles={regularArticles}
          />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-16 text-center">
      <h1 className="text-4xl sm:text-5xl font-serif text-stone-600 mb-4">Blog</h1>
      <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
        Insights, updates, and stories from the Hyprnote team
      </p>
    </header>
  );
}

function FeaturedSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="mb-20">
      <SectionHeader title="Featured" />
      <div className="grid gap-8 md:grid-cols-2">
        {articles.slice(0, 2).map((article) => <FeaturedCard key={article._meta.filePath} article={article} />)}
      </div>
    </section>
  );
}

function AllArticlesSection({
  featuredArticles,
  regularArticles,
}: {
  featuredArticles: Article[];
  regularArticles: Article[];
}) {
  if (regularArticles.length === 0 && featuredArticles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">No articles yet. Check back soon!</p>
      </div>
    );
  }

  if (regularArticles.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader title="All Articles" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {regularArticles.map((article) => <ArticleCard key={article._meta.filePath} article={article} />)}
      </div>
    </section>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <h2 className="text-2xl font-serif text-stone-600">{title}</h2>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

function FeaturedCard({ article }: { article: Article }) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.updated || article.created;

  return (
    <Link to="/blog/$slug" params={{ slug: article.slug }} className="group block h-full">
      <article className="h-full border border-neutral-100 rounded-sm overflow-hidden bg-white hover:shadow-xl transition-all duration-300">
        {hasCoverImage && (
          <ArticleImage
            src={article.coverImage}
            alt={article.title}
            isLoaded={coverImageLoaded}
            onLoad={() => setCoverImageLoaded(true)}
            onError={() => setCoverImageError(true)}
            loading="eager"
          />
        )}

        <div className="p-8">
          <FeaturedBadge />

          <h3 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-3 group-hover:text-stone-800 transition-colors line-clamp-2">
            {article.title}
          </h3>

          <p className="text-neutral-600 leading-relaxed mb-6 line-clamp-3">
            {article.summary}
          </p>

          <ArticleFooter
            author={article.author}
            date={displayDate}
            showYear
          />
        </div>
      </article>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.updated || article.created;

  return (
    <Link to="/blog/$slug" params={{ slug: article.slug }} className="group block h-full">
      <article className="h-full border border-neutral-100 rounded-sm overflow-hidden bg-white hover:shadow-lg transition-all duration-300 flex flex-col">
        {hasCoverImage && (
          <ArticleImage
            src={article.coverImage}
            alt={article.title}
            isLoaded={coverImageLoaded}
            onLoad={() => setCoverImageLoaded(true)}
            onError={() => setCoverImageError(true)}
            loading="lazy"
          />
        )}

        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-xl font-serif text-stone-600 mb-2 group-hover:text-stone-800 transition-colors line-clamp-2">
            {article.title}
          </h3>

          <p className="text-sm text-neutral-600 leading-relaxed mb-4 line-clamp-2 flex-1">
            {article.summary}
          </p>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <time dateTime={displayDate} className="text-xs text-neutral-500">
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </time>

            <span className="text-xs text-neutral-500 group-hover:text-stone-600 transition-colors font-medium">
              Read →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ArticleImage({
  src,
  alt,
  isLoaded,
  onLoad,
  onError,
  loading,
}: {
  src: string | undefined;
  alt: string;
  isLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
  loading: "eager" | "lazy";
}) {
  if (!src) {
    return null;
  }

  return (
    <div className="aspect-video overflow-hidden border-b border-neutral-100 bg-stone-50">
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover group-hover:scale-105 transition-all duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={onLoad}
        onError={onError}
        loading={loading}
      />
    </div>
  );
}

function FeaturedBadge() {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 bg-stone-50 px-3 py-1 rounded-full mb-4">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
      Featured
    </div>
  );
}

function ArticleFooter({
  author,
  date,
  showYear = false,
}: {
  author: string;
  date: string;
  showYear?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <span>{author}</span>
        <span>·</span>
        <time dateTime={date}>
          {new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            ...(showYear && { year: "numeric" }),
          })}
        </time>
      </div>

      <span className="text-sm text-neutral-500 group-hover:text-stone-600 transition-colors font-medium">
        Read →
      </span>
    </div>
  );
}
