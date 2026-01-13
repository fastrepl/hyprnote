import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import yaml from "js-yaml";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownLeft,
  EyeIcon,
  EyeOffIcon,
  FolderOpenIcon,
  Loader2,
  SparklesIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { cn } from "@hypr/utils";

import { MediaSelectorModal } from "../../components/admin/media-selector-modal";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});

interface ImportResult {
  success: boolean;
  mdx?: string;
  frontmatter?: {
    meta_title: string;
    display_title: string;
    meta_description: string;
    author: string;
    coverImage: string;
    featured: boolean;
    date: string;
  };
  error?: string;
}

interface SaveResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
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
] as const;

const remarkPlugins = [remarkGfm];

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const MarkdownPreview = memo(function MarkdownPreview({
  mdxContent,
}: {
  mdxContent: string;
}) {
  const debouncedContent = useDebouncedValue(mdxContent, 300);

  if (!debouncedContent) {
    return (
      <p className="text-neutral-400 text-center">Preview will appear here</p>
    );
  }
  return (
    <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-neutral-200 prose-th:bg-neutral-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-td:border prose-td:border-neutral-200 prose-td:px-3 prose-td:py-2 max-w-none">
      <Markdown remarkPlugins={remarkPlugins}>{debouncedContent}</Markdown>
    </article>
  );
});

function PreviewPanel({
  displayTitle,
  metaTitle,
  author,
  avatarUrl,
  date,
  mdxContent,
}: {
  displayTitle: string;
  metaTitle: string;
  author: string;
  avatarUrl?: string;
  date: string;
  mdxContent: string;
}) {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <header className="py-12 text-center max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-serif text-stone-600 mb-6">
          {displayTitle || metaTitle || "Untitled"}
        </h1>
        {author && (
          <div className="flex items-center justify-center gap-3 mb-2">
            {avatarUrl && (
              <img
                src={avatarUrl}
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
        <MarkdownPreview mdxContent={mdxContent} />
      </div>
    </div>
  );
}

const AuthorSelect = memo(function AuthorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedAuthor = AUTHORS.find((a) => a.name === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-2 text-left text-neutral-900 cursor-pointer"
      >
        {selectedAuthor ? (
          <>
            <img
              src={selectedAuthor.avatar}
              alt={selectedAuthor.name}
              className="size-5 rounded-full object-cover"
            />
            {selectedAuthor.name}
          </>
        ) : (
          <span className="text-neutral-400">Select author</span>
        )}
        <ChevronRightIcon
          className={cn([
            "size-3 ml-auto transition-transform text-neutral-400",
            isOpen && "rotate-90",
          ])}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-sm shadow-lg z-50">
          {AUTHORS.map((author) => (
            <button
              key={author.name}
              type="button"
              onClick={() => {
                onChange(author.name);
                setIsOpen(false);
              }}
              className={cn([
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer",
                "hover:bg-neutral-100 transition-colors",
                value === author.name && "bg-neutral-50",
              ])}
            >
              <img
                src={author.avatar}
                alt={author.name}
                className="size-5 rounded-full object-cover"
              />
              {author.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function stripFrontmatter(mdx: string): string {
  const frontmatterMatch = mdx.match(/^---\n[\s\S]*?\n---\n*/);
  if (frontmatterMatch) {
    return mdx.slice(frontmatterMatch[0].length);
  }
  return mdx;
}

function buildFrontmatter(metadata: {
  meta_title: string;
  display_title: string;
  meta_description: string;
  author: string;
  date: string;
  coverImage: string;
  category: string;
  featured: boolean;
}): string {
  const obj: Record<string, unknown> = {};

  if (metadata.meta_title) obj.meta_title = metadata.meta_title;
  if (metadata.display_title) obj.display_title = metadata.display_title;
  if (metadata.meta_description)
    obj.meta_description = metadata.meta_description;
  if (metadata.author) obj.author = metadata.author;
  if (metadata.date) obj.date = metadata.date;
  if (metadata.coverImage) obj.coverImage = metadata.coverImage;
  if (metadata.category) obj.category = metadata.category;
  obj.featured = metadata.featured;
  obj.published = true;

  return `---\n${yaml.dump(obj)}---`;
}

function MetadataRow({
  label,
  required,
  noBorder,
  showValidation,
  isInvalid,
  children,
}: {
  label: string;
  required?: boolean;
  noBorder?: boolean;
  showValidation?: boolean;
  isInvalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn([
        "flex transition-colors",
        !noBorder && "border-b border-neutral-200",
        showValidation && isInvalid && "bg-red-50",
      ])}
    >
      <span className="w-28 shrink-0 pl-6 pr-4 py-2 text-neutral-500 flex items-center relative">
        {required && <span className="absolute left-3 text-red-400">*</span>}
        {label}
      </span>
      {children}
    </div>
  );
}

const MetadataPanel = memo(function MetadataPanel({
  isExpanded,
  onToggleExpanded,
  metaTitle,
  setMetaTitle,
  displayTitle,
  setDisplayTitle,
  metaDescription,
  setMetaDescription,
  author,
  setAuthor,
  date,
  setDate,
  coverImage,
  setCoverImage,
  category,
  setCategory,
  slug,
  setSlug,
  featured,
  setFeatured,
  generateSlugFromTitle,
  showValidation,
  onOpenMediaModal,
}: {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  metaTitle: string;
  setMetaTitle: (v: string) => void;
  displayTitle: string;
  setDisplayTitle: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  author: string;
  setAuthor: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  coverImage: string;
  setCoverImage: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  featured: boolean;
  setFeatured: (v: boolean) => void;
  generateSlugFromTitle: () => void;
  showValidation: boolean;
  onOpenMediaModal: () => void;
}) {
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  return (
    <div
      className={cn([
        "shrink-0 relative",
        isExpanded && "border-b border-neutral-200",
      ])}
    >
      <div
        className={cn([
          "text-sm transition-all duration-200 overflow-hidden",
          isExpanded ? "max-h-125" : "max-h-0",
        ])}
      >
        <div
          className={cn([
            "flex border-b border-neutral-200 transition-colors",
            showValidation && !metaTitle && "bg-red-50",
          ])}
        >
          <button
            onClick={() => setIsTitleExpanded(!isTitleExpanded)}
            className="w-28 shrink-0 pl-6 pr-4 py-2 text-neutral-500 flex items-center justify-between hover:text-neutral-700 relative"
          >
            <span className="absolute left-3 text-red-400">*</span>
            Title
            <ChevronRightIcon
              className={cn([
                "size-4 transition-transform",
                isTitleExpanded && "rotate-90",
              ])}
            />
          </button>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="SEO meta title"
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
          />
        </div>
        {isTitleExpanded && (
          <div className="flex border-b border-neutral-200 bg-neutral-50">
            <span className="w-24 shrink-0 pl-6 pr-4 py-2 text-neutral-400 flex items-center gap-1 relative">
              <span className="text-neutral-300">└</span>
              Display
            </span>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              placeholder={metaTitle || "Display title (optional)"}
              className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
          </div>
        )}
        <MetadataRow
          label="Slug"
          required
          showValidation={showValidation}
          isInvalid={!slug}
        >
          <div className="flex-1 flex items-center">
            <span className="text-neutral-400 text-xs">hyprnote.com/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="article-slug"
              className="flex-1 px-1 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
            <button
              type="button"
              onClick={generateSlugFromTitle}
              className="p-1.5 text-neutral-400 hover:text-neutral-600"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </MetadataRow>
        <MetadataRow
          label="Description"
          required
          showValidation={showValidation}
          isInvalid={!metaDescription}
        >
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }
            }}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Meta description for SEO"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300 resize-none"
          />
        </MetadataRow>
        <MetadataRow label="Author" required>
          <AuthorSelect value={author} onChange={setAuthor} />
        </MetadataRow>
        <MetadataRow label="Date" required>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900"
          />
        </MetadataRow>
        <MetadataRow label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </MetadataRow>
        <MetadataRow label="Cover">
          <button
            type="button"
            onClick={onOpenMediaModal}
            className="flex-1 flex items-center gap-2 px-2 py-2 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            {coverImage ? (
              <span className="text-neutral-900 truncate">{coverImage}</span>
            ) : (
              <span className="text-neutral-300">/api/images/blog/...</span>
            )}
            <FolderOpenIcon className="w-4 h-4 text-neutral-400 ml-auto shrink-0" />
          </button>
        </MetadataRow>
        <MetadataRow label="Featured" noBorder>
          <div className="flex-1 flex items-center px-2 py-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded"
            />
          </div>
        </MetadataRow>
      </div>
      <button
        onClick={onToggleExpanded}
        className={cn([
          "absolute left-1/2 -translate-x-1/2 top-full z-10",
          "flex items-center justify-center",
          "w-10 h-4 bg-white border border-t-0 border-neutral-200 rounded-b-md",
          "text-neutral-400 hover:text-neutral-600",
          "transition-colors cursor-pointer",
        ])}
      >
        <ChevronDownIcon
          className={cn([
            "size-3 transition-transform duration-200",
            isExpanded && "rotate-180",
          ])}
        />
      </button>
    </div>
  );
});

function AdminIndexPage() {
  const [url, setUrl] = useState("");
  const [mdxContent, setMdxContent] = useState("");

  const [metaTitle, setMetaTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [author, setAuthor] = useState<string>(AUTHORS[0].name);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [featured, setFeatured] = useState(false);
  const [slug, setSlug] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (docUrl: string): Promise<ImportResult> => {
      const response = await fetch("/api/admin/import/google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: docUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse document");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.mdx) {
        setMdxContent(stripFrontmatter(data.mdx));
      }
      if (data.frontmatter) {
        if (data.frontmatter.meta_title) {
          setMetaTitle(data.frontmatter.meta_title);
          setDisplayTitle(data.frontmatter.meta_title);
        }
        if (data.frontmatter.meta_description)
          setMetaDescription(data.frontmatter.meta_description);
        if (data.frontmatter.author) setAuthor(data.frontmatter.author);
        if (data.frontmatter.date) setDate(data.frontmatter.date);
        if (data.frontmatter.coverImage)
          setCoverImage(data.frontmatter.coverImage);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (): Promise<SaveResult> => {
      const frontmatter = buildFrontmatter({
        meta_title: metaTitle,
        display_title: displayTitle,
        meta_description: metaDescription,
        author,
        date,
        coverImage,
        category,
        featured,
      });
      const fullContent = `${frontmatter}\n\n${mdxContent}`;
      const filename = slug.endsWith(".mdx") ? slug : `${slug}.mdx`;

      const response = await fetch("/api/admin/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fullContent,
          filename,
          folder: "articles",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }
      return response.json();
    },
  });

  const { reset: resetSaveMutation, mutate: mutateSave } = saveMutation;
  const { mutate: mutateParse } = parseMutation;

  const handleParse = useCallback(() => {
    if (!url) return;
    resetSaveMutation();
    mutateParse(url);
  }, [url, resetSaveMutation, mutateParse]);

  const handleSave = useCallback(() => {
    if (!mdxContent || !slug || !metaTitle || !metaDescription) return;
    mutateSave();
  }, [mdxContent, slug, metaTitle, metaDescription, mutateSave]);

  const generateSlugFromTitle = useCallback(() => {
    if (metaTitle) {
      const generated = metaTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
  }, [metaTitle]);

  const error = parseMutation.error || saveMutation.error;

  const handleContentChange = useCallback((newContent: string) => {
    setMdxContent(newContent);
  }, []);

  const selectedAuthor = AUTHORS.find((a) => a.name === author);
  const avatarUrl = selectedAuthor?.avatar;

  const headerInput = (
    <div className="h-12 border-b border-neutral-200 px-6 flex items-center gap-2 bg-neutral-50">
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 47 65" fill="none">
        <path
          d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
          fill="#4285F4"
        />
        <path
          d="M33.78125,17.7272727 C31.3467969,17.7272727 29.375,15.7440341 29.375,13.2954545 L29.375,0 L33.78125,0 C36.2157031,0 38.1875,1.98323864 38.1875,4.43181818 L38.1875,17.7272727 L47,17.7272727 L33.78125,17.7272727 Z"
          fill="#A1C2FA"
        />
        <path
          d="M11.75,47.2727273 L35.25,47.2727273 L35.25,44.3181818 L11.75,44.3181818 L11.75,47.2727273 Z M11.75,53.1818182 L29.375,53.1818182 L29.375,50.2272727 L11.75,50.2272727 L11.75,53.1818182 Z M11.75,32.5 L11.75,35.4545455 L35.25,35.4545455 L35.25,32.5 L11.75,32.5 Z M11.75,41.3636364 L35.25,41.3636364 L35.25,38.4090909 L11.75,38.4090909 L11.75,41.3636364 Z"
          fill="#F1F1F1"
        />
      </svg>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleParse()}
        placeholder="https://docs.google.com/document/d/..."
        className="flex-1 text-sm bg-transparent focus:outline-none"
      />
      <button
        onClick={handleParse}
        disabled={parseMutation.isPending || !url}
        className={cn([
          "p-1.5 disabled:opacity-30",
          url ? "text-blue-600 hover:text-blue-700" : "text-neutral-400",
        ])}
      >
        {parseMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CornerDownLeft className="w-4 h-4" />
        )}
      </button>
      {parseMutation.isSuccess && (
        <>
          <div className="w-px h-5 bg-neutral-300" />
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={cn([
              "p-1.5",
              isPreviewMode
                ? "text-blue-600 hover:text-blue-700"
                : "text-neutral-500 hover:text-neutral-700",
            ])}
          >
            {isPreviewMode ? (
              <EyeIcon className="w-4 h-4" />
            ) : (
              <EyeOffIcon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSave}
            onMouseEnter={() => {
              if (!mdxContent || !slug || !metaTitle || !metaDescription) {
                setShowValidation(true);
                if (!isMetadataExpanded) {
                  setIsMetadataExpanded(true);
                }
              }
            }}
            onMouseLeave={() => setShowValidation(false)}
            disabled={
              saveMutation.isPending ||
              !mdxContent ||
              !slug ||
              !metaTitle ||
              !metaDescription
            }
            className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Publishing..." : "Publish"}
          </button>
        </>
      )}
    </div>
  );

  if (!parseMutation.isSuccess) {
    return (
      <div className="h-full flex flex-col">
        {headerInput}
        <div className="flex-1 flex items-center justify-center">
          {parseMutation.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-neutral-600">Parsing Google Doc...</p>
            </div>
          ) : (
            <div className="w-full max-w-xl px-6 text-center">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
                Import from Google Docs
              </h1>
              <p className="text-sm text-neutral-600">
                Paste a public Google Docs link to convert it to MDX
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error instanceof Error ? error.message : "An error occurred"}
                  <button
                    onClick={() => parseMutation.reset()}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {headerInput}

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error instanceof Error ? error.message : "An error occurred"}
          <button
            onClick={() => saveMutation.reset()}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveMutation.isSuccess && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <span className="font-medium">Saved!</span>{" "}
          <code className="bg-green-100 px-1 rounded">
            {saveMutation.data?.path}
          </code>
          {saveMutation.data?.url && (
            <a
              href={saveMutation.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-green-600 hover:text-green-800 underline"
            >
              View on GitHub
            </a>
          )}
        </div>
      )}

      {isPreviewMode ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full">
              <MetadataPanel
                isExpanded={isMetadataExpanded}
                onToggleExpanded={() =>
                  setIsMetadataExpanded(!isMetadataExpanded)
                }
                metaTitle={metaTitle}
                setMetaTitle={setMetaTitle}
                displayTitle={displayTitle}
                setDisplayTitle={setDisplayTitle}
                metaDescription={metaDescription}
                setMetaDescription={setMetaDescription}
                author={author}
                setAuthor={setAuthor}
                date={date}
                setDate={setDate}
                coverImage={coverImage}
                setCoverImage={setCoverImage}
                category={category}
                setCategory={setCategory}
                slug={slug}
                setSlug={setSlug}
                featured={featured}
                setFeatured={setFeatured}
                generateSlugFromTitle={generateSlugFromTitle}
                showValidation={showValidation}
                onOpenMediaModal={() => setMediaModalOpen(true)}
              />
              <div className="flex-1 min-h-0 overflow-y-auto pt-4">
                <textarea
                  value={mdxContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full px-6 resize-none focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="w-px bg-neutral-200" />
          <ResizablePanel defaultSize={50} minSize={30}>
            <PreviewPanel
              displayTitle={displayTitle}
              metaTitle={metaTitle}
              author={author}
              avatarUrl={avatarUrl}
              date={date}
              mdxContent={mdxContent}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <MetadataPanel
            isExpanded={isMetadataExpanded}
            onToggleExpanded={() => setIsMetadataExpanded(!isMetadataExpanded)}
            metaTitle={metaTitle}
            setMetaTitle={setMetaTitle}
            displayTitle={displayTitle}
            setDisplayTitle={setDisplayTitle}
            metaDescription={metaDescription}
            setMetaDescription={setMetaDescription}
            author={author}
            setAuthor={setAuthor}
            date={date}
            setDate={setDate}
            coverImage={coverImage}
            setCoverImage={setCoverImage}
            category={category}
            setCategory={setCategory}
            slug={slug}
            setSlug={setSlug}
            featured={featured}
            setFeatured={setFeatured}
            generateSlugFromTitle={generateSlugFromTitle}
            showValidation={showValidation}
            onOpenMediaModal={() => setMediaModalOpen(true)}
          />
          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <textarea
              value={mdxContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full px-6 resize-none focus:outline-none font-mono text-sm"
            />
          </div>
        </div>
      )}

      <MediaSelectorModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        onSelect={setCoverImage}
        selectionMode="single"
      />
    </div>
  );
}
