import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

interface ContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  url: string;
}

interface FolderTreeItem {
  path: string;
  name: string;
  label: string;
  children: ContentItem[];
  expanded: boolean;
  loaded: boolean;
}

const CONTENT_FOLDERS = [
  { name: "articles", label: "Articles" },
  { name: "changelog", label: "Changelog" },
  { name: "docs", label: "Documentation" },
  { name: "handbook", label: "Handbook" },
  { name: "legal", label: "Legal" },
  { name: "templates", label: "Templates" },
];

async function fetchFolderContents(folderPath: string): Promise<ContentItem[]> {
  const response = await fetch(
    `/api/admin/content/list?path=${encodeURIComponent(folderPath)}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
    } catch {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
  }

  const data = await response.json();
  return data.items || [];
}

export const Route = createFileRoute("/admin/collections/")({
  component: CollectionsPage,
});

type TabType = "all" | "mdx" | "md";

function CollectionsPage() {
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [folders, setFolders] = useState<FolderTreeItem[]>(
    CONTENT_FOLDERS.map((f) => ({
      path: f.name,
      name: f.name,
      label: f.label,
      children: [],
      expanded: false,
      loaded: false,
    })),
  );

  const selectedFolderData = folders.find((f) => f.path === selectedFolder);

  const contentQuery = useQuery({
    queryKey: ["content", selectedFolder],
    queryFn: () => fetchFolderContents(selectedFolder!),
    enabled: !!selectedFolder,
  });

  const handleFolderClick = (folderPath: string) => {
    setSelectedFolder(folderPath);
    setFolders((prev) =>
      prev.map((f) => (f.path === folderPath ? { ...f, expanded: true } : f)),
    );
  };

  const toggleFolderExpanded = (folderPath: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.path === folderPath ? { ...f, expanded: !f.expanded } : f,
      ),
    );
  };

  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
  };

  const matchesFileTypeFilter = (item: ContentItem): boolean => {
    if (item.type === "dir") return false;
    if (activeTab === "all") return true;

    const ext = getFileExtension(item.name);
    switch (activeTab) {
      case "mdx":
        return ext === "mdx";
      case "md":
        return ext === "md";
      default:
        return true;
    }
  };

  const filterFolders = (
    items: FolderTreeItem[],
    query: string,
  ): FolderTreeItem[] => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.name.toLowerCase().includes(lowerQuery),
    );
  };

  const filteredFolders = filterFolders(folders, searchQuery);

  const items = contentQuery.data || [];
  const filteredItems = items.filter((item) => {
    if (item.type === "dir") return false;
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = matchesFileTypeFilter(item);
    return matchesSearch && matchesType;
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "mdx", label: "MDX" },
    { id: "md", label: "Markdown" },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-56 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="h-10 px-3 flex items-center border-b border-neutral-200">
          <div className="relative w-full">
            <Icon
              icon="mdi:magnify"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={cn([
                "w-full pl-7 pr-2 py-1 text-sm",
                "border border-neutral-200 rounded",
                "focus:outline-none focus:border-neutral-400",
                "placeholder:text-neutral-400",
              ])}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredFolders.map((folder) => {
            const isSelected = selectedFolder === folder.path;

            return (
              <div key={folder.path}>
                <div
                  className={cn([
                    "flex items-center gap-1 py-1.5 px-2 cursor-pointer text-sm",
                    "hover:bg-neutral-100 transition-colors",
                    isSelected && "bg-neutral-100",
                  ])}
                  onClick={() => handleFolderClick(folder.path)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolderExpanded(folder.path);
                    }}
                    className="w-4 h-4 flex items-center justify-center"
                  >
                    <Icon
                      icon={
                        folder.expanded
                          ? "mdi:chevron-down"
                          : "mdi:chevron-right"
                      }
                      className="text-neutral-400 text-xs"
                    />
                  </button>
                  <Icon
                    icon={folder.expanded ? "mdi:folder-open" : "mdi:folder"}
                    className="text-neutral-400 text-sm"
                  />
                  <span className="truncate text-neutral-700">
                    {folder.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedFolder && (
          <div className="p-2 border-t border-neutral-200">
            <Link
              to="/admin/import"
              className={cn([
                "w-full py-2 text-sm font-medium rounded flex items-center justify-center",
                "bg-neutral-900 text-white",
                "hover:bg-neutral-800 transition-colors",
              ])}
            >
              + Import
            </Link>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-10 flex items-stretch border-b border-neutral-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn([
                "px-4 text-sm font-medium transition-colors",
                "border-r border-neutral-200",
                activeTab === tab.id
                  ? "bg-neutral-100 text-neutral-900"
                  : "bg-white text-neutral-600 hover:bg-neutral-50",
              ])}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedFolder ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
              <Icon icon="mdi:folder-open-outline" className="text-4xl mb-3" />
              <p className="text-sm">Select a collection to view files</p>
            </div>
          ) : contentQuery.isLoading ? (
            <div className="flex items-center justify-center h-64 text-neutral-500">
              <Icon icon="mdi:loading" className="animate-spin text-2xl mr-2" />
              Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
              <Icon
                icon="mdi:file-document-outline"
                className="text-4xl mb-3"
              />
              <p className="text-sm">No files found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <div
                  key={item.path}
                  className={cn([
                    "flex items-center justify-between px-3 py-2 rounded",
                    "hover:bg-neutral-50 transition-colors",
                    "border border-transparent hover:border-neutral-200",
                  ])}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="mdi:file-document-outline"
                      className="text-neutral-400"
                    />
                    <span className="text-sm text-neutral-700">
                      {item.name}
                    </span>
                    <span className="text-xs text-neutral-400 px-1.5 py-0.5 bg-neutral-100 rounded">
                      {getFileExtension(item.name).toUpperCase()}
                    </span>
                  </div>
                  <a
                    href={`https://github.com/fastrepl/hyprnote/blob/main/apps/web/content/${item.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    <Icon icon="mdi:github" className="text-base" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
