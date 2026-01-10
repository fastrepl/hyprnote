import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin/import/")({
  component: ImportPage,
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

const CONTENT_FOLDERS = [
  { value: "articles", label: "Articles (Blog)" },
  { value: "changelog", label: "Changelog" },
  { value: "docs", label: "Documentation" },
  { value: "handbook", label: "Handbook" },
  { value: "legal", label: "Legal" },
  { value: "templates", label: "Templates" },
];

function ImportPage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [slug, setSlug] = useState("");
  const [folder, setFolder] = useState("articles");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [editedMdx, setEditedMdx] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  const handleImport = async () => {
    if (!url) {
      setError("Please enter a Google Docs URL");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaveResult(null);

    try {
      const response = await fetch("/api/admin/import/google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: title || undefined,
          author: author || undefined,
          description: description || undefined,
          coverImage: coverImage || undefined,
          slug: slug || undefined,
        }),
      });

      const data: ImportResult = await response.json();

      if (!data.success) {
        setError(data.error || "Import failed");
        return;
      }

      setResult(data);
      setEditedMdx(data.mdx || "");

      if (data.frontmatter) {
        if (!title) setTitle(data.frontmatter.meta_title);
        if (!author) setAuthor(data.frontmatter.author);
        if (!description) setDescription(data.frontmatter.meta_description);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedMdx || !slug) {
      setError("Please provide content and a filename slug");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveResult(null);

    try {
      const filename = slug.endsWith(".mdx") ? slug : `${slug}.mdx`;

      const response = await fetch("/api/admin/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editedMdx,
          filename,
          folder,
        }),
      });

      const data: SaveResult = await response.json();

      if (!data.success) {
        setError(data.error || "Save failed");
        return;
      }

      setSaveResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const generateSlugFromTitle = () => {
    if (title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generatedSlug);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">
        Import from Google Docs
      </h1>

      <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
        <h2 className="text-lg font-medium text-neutral-900 mb-4">
          Step 1: Enter Google Docs URL
        </h2>
        <p className="text-sm text-neutral-600 mb-4">
          The document must be published to the web. Go to File &gt; Share &gt;
          Publish to web in Google Docs.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Google Docs URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Title (optional, auto-detected)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for SEO"
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                Filename Slug
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-article-slug"
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={generateSlugFromTitle}
                  className="px-3 py-2 text-sm text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
                  title="Generate from title"
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !url}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import Document"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {result && result.success && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">
            Step 2: Review & Edit MDX
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Generated MDX Content
            </label>
            <textarea
              value={editedMdx}
              onChange={(e) => setEditedMdx(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Save to Folder
              </label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONTENT_FOLDERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Filename
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">
                  content/{folder}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="filename"
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-500">.mdx</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !editedMdx || !slug}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save to Repository"}
          </button>
        </div>
      )}

      {saveResult && saveResult.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <p className="font-medium">File saved successfully!</p>
          <p className="text-sm mt-1">
            Path:{" "}
            <code className="bg-green-100 px-1 rounded">{saveResult.path}</code>
          </p>
          {saveResult.url && (
            <p className="text-sm mt-1">
              <a
                href={saveResult.url}
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
