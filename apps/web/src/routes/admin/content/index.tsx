import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/admin/content/")({
  component: ContentManagementPage,
});

interface ContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  url: string;
}

interface ContentFolder {
  name: string;
  path: string;
  items: ContentItem[];
  loading: boolean;
  expanded: boolean;
}

const CONTENT_FOLDERS = [
  { name: "Articles", path: "articles" },
  { name: "Changelog", path: "changelog" },
  { name: "Documentation", path: "docs" },
  { name: "Handbook", path: "handbook" },
  { name: "Legal", path: "legal" },
  { name: "Templates", path: "templates" },
];

function ContentManagementPage() {
  const [folders, setFolders] = useState<ContentFolder[]>(
    CONTENT_FOLDERS.map((f) => ({
      name: f.name,
      path: f.path,
      items: [],
      loading: false,
      expanded: false,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFolderContents = useCallback(async (folderPath: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.path === folderPath ? { ...f, loading: true } : f)),
    );

    try {
      const response = await fetch(
        `/api/admin/content/list?path=${encodeURIComponent(folderPath)}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.error || `Failed to fetch: ${response.status}`,
          );
        } catch {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
      }

      const data = await response.json();

      setFolders((prev) =>
        prev.map((f) =>
          f.path === folderPath
            ? { ...f, items: data.items || [], loading: false, expanded: true }
            : f,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
      setFolders((prev) =>
        prev.map((f) => (f.path === folderPath ? { ...f, loading: false } : f)),
      );
    }
  }, []);

  const toggleFolder = (folderPath: string) => {
    const folder = folders.find((f) => f.path === folderPath);
    if (!folder) return;

    if (folder.expanded) {
      setFolders((prev) =>
        prev.map((f) =>
          f.path === folderPath ? { ...f, expanded: false } : f,
        ),
      );
    } else if (folder.items.length === 0) {
      fetchFolderContents(folderPath);
    } else {
      setFolders((prev) =>
        prev.map((f) => (f.path === folderPath ? { ...f, expanded: true } : f)),
      );
    }
  };

  const filteredFolders = folders.map((folder) => ({
    ...folder,
    items: folder.items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchQuery === "",
    ),
  }));

  const totalItems = folders.reduce(
    (acc, folder) => acc + folder.items.length,
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Content Management
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Browse and manage MDX content files
          </p>
        </div>
        <Link
          to="/admin/import"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Import from Google Docs
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search content files..."
          className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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

      <div className="bg-white rounded-lg border border-neutral-200">
        {filteredFolders.map((folder, index) => (
          <div
            key={folder.path}
            className={index > 0 ? "border-t border-neutral-200" : ""}
          >
            <button
              onClick={() => toggleFolder(folder.path)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-neutral-400">
                  {folder.expanded ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-lg font-medium text-neutral-900">
                  {folder.name}
                </span>
                {folder.items.length > 0 && (
                  <span className="text-sm text-neutral-500">
                    ({folder.items.length} files)
                  </span>
                )}
              </div>
              {folder.loading && (
                <span className="text-sm text-neutral-500">Loading...</span>
              )}
            </button>

            {folder.expanded && folder.items.length > 0 && (
              <div className="border-t border-neutral-100 bg-neutral-50">
                {folder.items
                  .filter((item) => item.type === "file")
                  .map((item) => (
                    <div
                      key={item.path}
                      className="px-4 py-2 pl-12 flex items-center justify-between hover:bg-neutral-100 transition-colors border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-neutral-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm text-neutral-700">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://github.com/fastrepl/hyprnote/blob/main/apps/web/content/${item.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View on GitHub
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {folder.expanded &&
              folder.items.length === 0 &&
              !folder.loading && (
                <div className="px-4 py-3 pl-12 text-sm text-neutral-500 bg-neutral-50 border-t border-neutral-100">
                  No files found
                </div>
              )}
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-neutral-500">
        {totalItems > 0
          ? `${totalItems} content files loaded`
          : "Click a folder to load its contents"}
      </div>
    </div>
  );
}
