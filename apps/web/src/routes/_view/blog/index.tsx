import { createFileRoute, Link } from "@tanstack/react-router";
import { allArticles, type Article } from "content-collections";
import { useState } from "react";

import { cn } from "@hypr/utils";

const AUTHOR_AVATARS: Record<string, string> = {
  "John Jeong":
    "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/john.png",
  Harshika:
    "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/harshika.jpeg",
  "Yujong Lee":
    "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong.png",
};

export const Route = createFileRoute("/_view/blog/")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Blog - Hyprnote" },
      {
        name: "description",
        content: "Insights, updates, and stories from the Hyprnote team",
      },
      { property: "og:title", content: "Blog - Hyprnote" },
      {
        property: "og:description",
        content: "Insights, updates, and stories from the Hyprnote team",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/blog" },
    ],
  }),
});

function Component() {
  const publishedArticles = allArticles.filter(
    (a) => import.meta.env.DEV || a.published !== false,
  );
  const sortedArticles = [...publishedArticles].sort((a, b) => {
    const aDate = a.updated || a.created;
    const bDate = b.updated || b.created;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const featuredArticles = sortedArticles.filter((a) => a.featured);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto border-x border-neutral-100 bg-white min-h-screen">
        <Header />
        <FeaturedSection articles={featuredArticles} />
        <AllArticlesSection articles={sortedArticles} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-16 text-center">
      <h1 className="text-4xl sm:text-5xl font-serif text-stone-600 mb-4">
        Blog
      </h1>
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

  const [mostRecent, ...others] = articles;
  const displayedOthers = others.slice(0, 3);

  return (
    <section className="mb-20">
      <SectionHeader title="Featured" />
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <FeaturedCard article={mostRecent} featured={true} />
        {displayedOthers.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            {displayedOthers.map((article) => (
              <CompactFeaturedCard
                key={article._meta.filePath}
                article={article}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AllArticlesSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">No articles yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <section>
      <SectionHeader title="All" />
      <div className="divide-y divide-neutral-100 sm:divide-y-0">
        {articles.map((article) => (
          <ArticleListItem key={article._meta.filePath} article={article} />
        ))}
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

function FeaturedCard({
  article,
  featured = false,
}: {
  article: Article;
  featured?: boolean;
}) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.updated || article.created;

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className="group block h-full"
    >
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
          {featured && <FeaturedBadge />}

          <h3 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-3 group-hover:text-stone-800 transition-colors line-clamp-2">
            {article.display_title}
          </h3>

          <p className="text-neutral-600 leading-relaxed mb-6 line-clamp-3">
            {article.meta_description}
          </p>

          <ArticleFooter author={article.author} date={displayDate} showYear />
        </div>
      </article>
    </Link>
  );
}

function CompactFeaturedCard({ article }: { article: Article }) {
  const displayDate = article.updated || article.created;
  const avatarUrl = AUTHOR_AVATARS[article.author];

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className="group block h-full"
    >
      <article className="h-full border border-neutral-100 rounded-sm overflow-hidden bg-white hover:shadow-xl transition-all duration-300 p-6">
        <h3 className="text-lg font-serif text-stone-600 mb-3 group-hover:text-stone-800 transition-colors line-clamp-2">
          {article.display_title}
        </h3>

        <div className="flex items-center gap-3 text-sm text-neutral-500 mt-auto">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={article.author}
              className="w-5 h-5 rounded-full object-cover"
            />
          )}
          <span>{article.author}</span>
          <span>·</span>
          <time dateTime={displayDate}>
            {new Date(displayDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      </article>
    </Link>
  );
}

function ArticleListItem({ article }: { article: Article }) {
  const displayDate = article.updated || article.created;
  const avatarUrl = AUTHOR_AVATARS[article.author];

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className="group block"
    >
      <article className="py-4 hover:bg-stone-50/50 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 min-w-0 sm:max-w-2xl">
            <span className="text-base font-serif text-stone-600 group-hover:text-stone-800 transition-colors truncate">
              {article.title}
            </span>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={article.author}
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-neutral-500 whitespace-nowrap">
                {article.author}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:hidden">
            <div className="flex items-center gap-3">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={article.author}
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-neutral-500">{article.author}</span>
            </div>
            <time
              dateTime={displayDate}
              className="text-sm text-neutral-500 shrink-0"
            >
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
          <div className="h-px flex-1 bg-neutral-200 hidden sm:block" />
          <time
            dateTime={displayDate}
            className="text-sm text-neutral-500 shrink-0 hidden sm:block whitespace-nowrap"
          >
            {new Date(displayDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
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
    <div className="aspect-40/21 overflow-hidden border-b border-neutral-100 bg-stone-50">
      <img
        src={src}
        alt={alt}
        className={cn([
          "w-full h-full object-cover group-hover:scale-105 transition-all duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
        ])}
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
  const avatarUrl = AUTHOR_AVATARS[author];

  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={author}
            className="w-6 h-6 rounded-full object-cover"
          />
        )}
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
