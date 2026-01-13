import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
    published: boolean;
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

const AUTHORS = ["Harshika", "John Jeong", "Yujong Lee"] as const;
const CATEGORIES = [
  "Case Study",
  "Hyprnote Weekly",
  "Productivity Hack",
  "Engineering",
] as const;

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
  published: boolean;
}): string {
  const lines: string[] = ["---"];
  if (metadata.meta_title) lines.push(`meta_title: "${metadata.meta_title}"`);
  if (metadata.display_title)
    lines.push(`display_title: "${metadata.display_title}"`);
  if (metadata.meta_description)
    lines.push(`meta_description: "${metadata.meta_description}"`);
  if (metadata.author) lines.push(`author: "${metadata.author}"`);
  if (metadata.date) lines.push(`date: "${metadata.date}"`);
  if (metadata.coverImage) lines.push(`coverImage: "${metadata.coverImage}"`);
  if (metadata.category) lines.push(`category: "${metadata.category}"`);
  lines.push(`featured: ${metadata.featured}`);
  lines.push(`published: ${metadata.published}`);
  lines.push("---");
  return lines.join("\n");
}

function AdminIndexPage() {
  const [url, setUrl] = useState("");
  const [mdxContent, setMdxContent] = useState("");

  const [metaTitle, setMetaTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [author, setAuthor] = useState<string>(AUTHORS[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [slug, setSlug] = useState("");

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
        if (data.frontmatter.meta_title)
          setMetaTitle(data.frontmatter.meta_title);
        if (data.frontmatter.display_title)
          setDisplayTitle(data.frontmatter.display_title);
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
        published,
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

  const handleParse = () => {
    if (!url) return;
    saveMutation.reset();
    parseMutation.mutate(url);
  };

  const handleSave = () => {
    if (!mdxContent || !slug || !metaTitle || !metaDescription) return;
    saveMutation.mutate();
  };

  const generateSlugFromTitle = () => {
    if (metaTitle) {
      const generated = metaTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
  };

  const error = parseMutation.error || saveMutation.error;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">
        Import from Google Docs
      </h1>

      <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">
          Step 1: Paste Google Docs URL
        </h2>
        <p className="text-sm text-neutral-600 mb-4">
          The document must be published to the web or shared with "Anyone with
          the link can view".
        </p>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/document/d/..."
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleParse}
            disabled={parseMutation.isPending || !url}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {parseMutation.isPending ? "Parsing..." : "Parse"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error instanceof Error ? error.message : "An error occurred"}
          <button
            onClick={() => {
              parseMutation.reset();
              saveMutation.reset();
            }}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {parseMutation.isSuccess && (
        <>
          <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">
              Step 2: Edit MDX Content
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              You can add custom components. Available:
            </p>
            <div className="text-xs text-neutral-500 mb-4 font-mono bg-neutral-50 p-3 rounded-md space-y-1">
              <div>
                {
                  '<CtaCard title="..." description="..." buttonText="..." buttonUrl="..." />'
                }
              </div>
              <div>
                {'<Callout type="info|warning|error">content</Callout>'}
              </div>
              <div>{'<Tweet id="..." />'}</div>
              <div>{"<Mermaid>diagram code</Mermaid>"}</div>
            </div>
            <textarea
              value={mdxContent}
              onChange={(e) => setMdxContent(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
            <h2 className="text-lg font-medium text-neutral-900 mb-4">
              Step 3: Metadata
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Meta Title *
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Meta Description *
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Author *
                  </label>
                  <select
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {AUTHORS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Cover Image Path
                </label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="/api/images/blog/slug/cover.png"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Slug (filename) *
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 text-sm text-neutral-500 bg-neutral-100 rounded-md">
                    content/articles/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-article-slug"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="px-3 py-2 text-sm text-neutral-500 bg-neutral-100 rounded-md">
                    .mdx
                  </span>
                  <button
                    type="button"
                    onClick={generateSlugFromTitle}
                    className="px-3 py-2 text-sm text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span className="text-sm text-neutral-700">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span className="text-sm text-neutral-700">Published</span>
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={
                  saveMutation.isPending ||
                  !mdxContent ||
                  !slug ||
                  !metaTitle ||
                  !metaDescription
                }
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save to Repository"}
              </button>
            </div>
          </div>
        </>
      )}

      {saveMutation.isSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <p className="font-medium">File saved successfully!</p>
          <p className="text-sm mt-1">
            Path:{" "}
            <code className="bg-green-100 px-1 rounded">
              {saveMutation.data?.path}
            </code>
          </p>
          {saveMutation.data?.url && (
            <p className="text-sm mt-1">
              <a
                href={saveMutation.data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 underline"
              >
                View on GitHub
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
