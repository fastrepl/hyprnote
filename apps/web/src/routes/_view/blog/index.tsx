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
  const displayedOthers = others.slice(0, 4);

  return (
    <section className="mb-20">
      <SectionHeader title="Featured" />
      <div
        className={cn([
          "flex flex-col gap-3",
          "md:gap-4",
          "lg:grid lg:grid-cols-2",
        ])}
      >
        <MostRecentFeaturedCard article={mostRecent} />
        {displayedOthers.length > 0 && (
          <div
            className={cn([
              "flex flex-col gap-3",
              "md:flex-row md:gap-3",
              "lg:flex-col",
            ])}
          >
            {displayedOthers.map((article, index) => (
              <OtherFeaturedCard
                key={article._meta.filePath}
                article={article}
                className={index === 3 ? "hidden lg:block" : ""}
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

function MostRecentFeaturedCard({ article }: { article: Article }) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.updated || article.created;
  const avatarUrl = AUTHOR_AVATARS[article.author];

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className="group block"
    >
      <article
        className={cn([
          "h-full border border-neutral-100 rounded-sm overflow-hidden bg-white",
          "hover:shadow-xl transition-all duration-300",
        ])}
      >
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

        <div className="p-6 md:p-8">
          <h3
            className={cn([
              "text-xl font-serif text-stone-600 mb-2",
              "group-hover:text-stone-800 transition-colors line-clamp-2",
              "md:text-2xl md:mb-3",
            ])}
          >
            {article.display_title}
          </h3>

          <p className="text-neutral-600 leading-relaxed mb-4 line-clamp-2 md:line-clamp-3">
            {article.meta_description}
          </p>

          <div className="flex items-center gap-3 text-sm text-neutral-500">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={article.author}
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <span>{article.author}</span>
            <span>·</span>
            <time dateTime={displayDate}>
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}

function OtherFeaturedCard({
  article,
  className,
}: {
  article: Article;
  className?: string;
}) {
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const hasCoverImage = !coverImageError;
  const displayDate = article.updated || article.created;
  const avatarUrl = AUTHOR_AVATARS[article.author];

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: article.slug }}
      className={cn([
        "group block md:flex-1 md:min-w-0 lg:flex-auto",
        className,
      ])}
    >
      <article
        className={cn([
          "h-full border border-neutral-100 rounded-sm overflow-hidden bg-white",
          "hover:shadow-xl transition-all duration-300",
          "flex flex-col",
          "lg:flex-row",
        ])}
      >
        {hasCoverImage && (
          <div
            className={cn([
              "aspect-40/21 shrink-0 overflow-hidden bg-stone-50",
              "border-b border-neutral-100",
              "lg:aspect-auto lg:w-32 lg:border-b-0 lg:border-r",
            ])}
          >
            <img
              src={article.coverImage}
              alt={article.title}
              className={cn([
                "w-full h-full object-cover",
                "group-hover:scale-105 transition-all duration-500",
                coverImageLoaded ? "opacity-100" : "opacity-0",
              ])}
              onLoad={() => setCoverImageLoaded(true)}
              onError={() => setCoverImageError(true)}
              loading="lazy"
            />
          </div>
        )}

        <div
          className={cn([
            "flex-1 min-w-0 p-4 flex flex-col justify-center",
            "lg:p-4",
          ])}
        >
          <h3
            className={cn([
              "text-base font-serif text-stone-600 mb-2",
              "group-hover:text-stone-800 transition-colors line-clamp-2",
            ])}
          >
            {article.display_title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={article.author}
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            <span className="truncate">{article.author}</span>
            <span>·</span>
            <time dateTime={displayDate} className="shrink-0">
              {new Date(displayDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </time>
          </div>
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
              className="text-sm text-neutral-500 shrink-0 font-mono"
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
            className="text-sm text-neutral-500 shrink-0 hidden sm:block whitespace-nowrap font-mono"
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
