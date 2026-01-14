import { MDXContent } from "@content-collections/mdx/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allArticles } from "content-collections";
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BlogEditor from "@hypr/tiptap/blog-editor";
import "@hypr/tiptap/styles.css";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { defaultMDXComponents } from "@/components/mdx";

interface ArticleMetadata {
  meta_title: string;
  display_title: string;
  meta_description: string;
  author: string;
  date: string;
  coverImage: string;
  published: boolean;
  featured: boolean;
  category: string;
}

interface ArticleData {
  content: string;
  mdx: string;
  slug: string;
  meta_title: string;
  display_title: string;
  meta_description: string;
  author: string;
  date: string;
  coverImage: string;
  published: boolean;
  featured: boolean;
  category: string;
  fileName: string;
}

const AUTHORS = [
  { name: "Harshika", avatar: "/api/images/team/harshika.jpeg" },
  { name: "John Jeong", avatar: "/api/images/team/john.png" },
  { name: "Yujong Lee", avatar: "/api/images/team/yujong.png" },
];

const CATEGORIES = [
  "Case Study",
  "Products In-depth",
  "Hyprnote Weekly",
  "Productivity Hack",
  "Engineering",
];

function getArticleBySlug(slug: string): ArticleData | undefined {
  const article = allArticles.find((a) => a.slug === slug);
  if (!article) return undefined;

  return {
    content: article.content,
    mdx: article.mdx,
    slug: article.slug,
    meta_title: article.meta_title,
    display_title: article.display_title || "",
    meta_description: article.meta_description,
    author: article.author,
    date: article.date,
    coverImage: article.coverImage || "",
    published: article.published,
    featured: article.featured ?? false,
    category: article.category || "",
    fileName: article._meta.fileName,
  };
}

export const Route = createFileRoute("/admin/collections/$slug")({
  component: ArticleEditorPage,
  head: () => ({
    meta: [
      { title: "Article Editor - Hyprnote Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ArticleEditorPage() {
  const { slug } = Route.useParams();
  const article = useMemo(() => getArticleBySlug(slug), [slug]);

  const [content, setContent] = useState(article?.content || "");
  const [metaTitle, setMetaTitle] = useState(article?.meta_title || "");
  const [displayTitle, setDisplayTitle] = useState(
    article?.display_title || "",
  );
  const [metaDescription, setMetaDescription] = useState(
    article?.meta_description || "",
  );
  const [author, setAuthor] = useState(article?.author || "");
  const [date, setDate] = useState(article?.date || "");
  const [coverImage, setCoverImage] = useState(article?.coverImage || "");
  const [published, setPublished] = useState(article?.published || false);
  const [featured, setFeatured] = useState(article?.featured || false);
  const [category, setCategory] = useState(article?.category || "");

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");

  const lastSavedContentRef = useRef(article?.content || "");
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      path: string;
      content: string;
      metadata: ArticleMetadata;
    }) => {
      const response = await fetch("/api/admin/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }
      return response.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      lastSavedContentRef.current = content;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: {
      path: string;
      content: string;
      metadata: ArticleMetadata;
    }) => {
      const response = await fetch("/api/admin/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          metadata: { ...data.metadata, published: true },
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to publish");
      }
      return response.json();
    },
    onSuccess: () => {
      setPublished(true);
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      lastSavedContentRef.current = content;
    },
  });

  useEffect(() => {
    if (content !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
      setAutoSaveStatus("idle");

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        if (article) {
          setAutoSaveStatus("saving");
          saveMutation.mutate(
            {
              path: `articles/${article.fileName}`,
              content,
              metadata: {
                meta_title: metaTitle,
                display_title: displayTitle,
                meta_description: metaDescription,
                author,
                date,
                coverImage,
                published,
                featured,
                category,
              },
            },
            {
              onSuccess: () => {
                setAutoSaveStatus("saved");
              },
            },
          );
        }
      }, 30000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    content,
    metaTitle,
    displayTitle,
    metaDescription,
    author,
    date,
    coverImage,
    published,
    featured,
    category,
    article,
    saveMutation,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (article) {
          saveMutation.mutate({
            path: `articles/${article.fileName}`,
            content,
            metadata: {
              meta_title: metaTitle,
              display_title: displayTitle,
              meta_description: metaDescription,
              author,
              date,
              coverImage,
              published,
              featured,
              category,
            },
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    article,
    content,
    metaTitle,
    displayTitle,
    metaDescription,
    author,
    date,
    coverImage,
    published,
    featured,
    category,
    saveMutation,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(() => {
    if (article) {
      saveMutation.mutate({
        path: `articles/${article.fileName}`,
        content,
        metadata: {
          meta_title: metaTitle,
          display_title: displayTitle,
          meta_description: metaDescription,
          author,
          date,
          coverImage,
          published,
          featured,
          category,
        },
      });
    }
  }, [
    article,
    content,
    metaTitle,
    displayTitle,
    metaDescription,
    author,
    date,
    coverImage,
    published,
    featured,
    category,
    saveMutation,
  ]);

  const handlePublish = useCallback(() => {
    if (article) {
      publishMutation.mutate({
        path: `articles/${article.fileName}`,
        content,
        metadata: {
          meta_title: metaTitle,
          display_title: displayTitle,
          meta_description: metaDescription,
          author,
          date,
          coverImage,
          published,
          featured,
          category,
        },
      });
    }
  }, [
    article,
    content,
    metaTitle,
    displayTitle,
    metaDescription,
    author,
    date,
    coverImage,
    published,
    featured,
    category,
    publishMutation,
  ]);

  if (!article) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-700">
            Article not found
          </h2>
          <p className="text-sm text-neutral-500 mt-2">
            The article with slug "{slug}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  const selectedAuthor = AUTHORS.find((a) => a.name === author);

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 border-b border-neutral-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/collections/"
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium text-neutral-900">{slug}</h1>
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600">Unsaved changes</span>
            )}
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-blue-600">Auto-saving...</span>
            )}
            {autoSaveStatus === "saved" && lastSaveTime && (
              <span className="text-xs text-green-600">
                Saved at {lastSaveTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={cn([
              "px-3 py-1.5 text-sm rounded flex items-center gap-2",
              "border border-neutral-200",
              isPreviewMode
                ? "bg-blue-50 text-blue-700"
                : "bg-white text-neutral-700",
            ])}
          >
            {isPreviewMode ? (
              <>
                <EyeOffIcon className="size-4" />
                Exit Preview
              </>
            ) : (
              <>
                <EyeIcon className="size-4" />
                Preview
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-3 py-1.5 text-sm rounded flex items-center gap-2 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            Save Draft
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishMutation.isPending || published}
            className={cn([
              "px-3 py-1.5 text-sm rounded flex items-center gap-2",
              published
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50",
            ])}
          >
            {publishMutation.isPending ? (
              <Spinner className="size-4" />
            ) : published ? (
              <CheckIcon className="size-4" />
            ) : null}
            {published ? "Published" : "Publish"}
          </button>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto p-6">
            <BlogEditor
              content={content}
              onChange={(newContent) => setContent(newContent)}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          {isPreviewMode ? (
            <div className="h-full overflow-y-auto bg-white">
              <header className="py-12 text-center max-w-3xl mx-auto px-6">
                <h1 className="text-3xl font-serif text-stone-600 mb-6">
                  {displayTitle || metaTitle || "Untitled"}
                </h1>
                {author && (
                  <div className="flex items-center justify-center gap-3 mb-2">
                    {selectedAuthor?.avatar && (
                      <img
                        src={selectedAuthor.avatar}
                        alt={author}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <p className="text-base text-neutral-600">{author}</p>
                  </div>
                )}
                {date && (
                  <time className="text-xs font-mono text-neutral-500">
                    {new Date(date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
              </header>
              <div className="max-w-3xl mx-auto px-6 pb-8">
                <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-headings:no-underline prose-headings:decoration-transparent prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-pre:prose-code:bg-transparent prose-pre:prose-code:border-0 prose-pre:prose-code:p-0 prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8 max-w-none">
                  <MDXContent
                    code={article.mdx}
                    components={defaultMDXComponents}
                  />
                </article>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6 bg-neutral-50">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Meta Title *
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO meta title"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Display Title
                  </label>
                  <input
                    type="text"
                    value={displayTitle}
                    onChange={(e) => setDisplayTitle(e.target.value)}
                    placeholder="Display title (optional)"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Meta Description *
                  </label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Meta description for SEO"
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Author *
                  </label>
                  <select
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="">Select author</option>
                    {AUTHORS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Cover Image
                  </label>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="/api/images/blog/slug/cover.png"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-neutral-700">Published</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-neutral-700">Featured</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
