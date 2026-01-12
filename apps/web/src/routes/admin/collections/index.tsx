import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  allArticles,
  allChangelogs,
  allDocs,
  allHandbooks,
  allLegals,
  allTemplates,
} from "content-collections";
import { useState } from "react";

import { cn } from "@hypr/utils";

interface ContentItem {
  name: string;
  path: string;
  slug: string;
  type: "file";
  collection: string;
}

interface CollectionInfo {
  name: string;
  label: string;
  items: ContentItem[];
}

function getCollections(): CollectionInfo[] {
  return [
    {
      name: "articles",
      label: "Articles",
      items: allArticles.map((a) => ({
        name: a._meta.fileName,
        path: `articles/${a._meta.fileName}`,
        slug: a.slug,
        type: "file" as const,
        collection: "articles",
      })),
    },
    {
      name: "changelog",
      label: "Changelog",
      items: allChangelogs.map((c) => ({
        name: c._meta.fileName,
        path: `changelog/${c._meta.fileName}`,
        slug: c.slug,
        type: "file" as const,
        collection: "changelog",
      })),
    },
    {
      name: "docs",
      label: "Documentation",
      items: allDocs.map((d) => ({
        name: d._meta.fileName,
        path: `docs/${d._meta.path}`,
        slug: d.slug,
        type: "file" as const,
        collection: "docs",
      })),
    },
    {
      name: "handbook",
      label: "Handbook",
      items: allHandbooks.map((h) => ({
        name: h._meta.fileName,
        path: `handbook/${h._meta.path}`,
        slug: h.slug,
        type: "file" as const,
        collection: "handbook",
      })),
    },
    {
      name: "legal",
      label: "Legal",
      items: allLegals.map((l) => ({
        name: l._meta.fileName,
        path: `legal/${l._meta.fileName}`,
        slug: l.slug,
        type: "file" as const,
        collection: "legal",
      })),
    },
    {
      name: "templates",
      label: "Templates",
      items: allTemplates.map((t) => ({
        name: t._meta.fileName,
        path: `templates/${t._meta.fileName}`,
        slug: t.slug,
        type: "file" as const,
        collection: "templates",
      })),
    },
  ];
}

export const Route = createFileRoute("/admin/collections/")({
  component: CollectionsPage,
});

type TabType = "all" | "mdx" | "md";

function CollectionsPage() {
  const collections = getCollections();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(),
  );

  const toggleCollectionExpanded = (name: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleCollectionClick = (name: string) => {
    setSelectedCollection(name);
    setExpandedCollections((prev) => new Set(prev).add(name));
  };

  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
  };

  const matchesFileTypeFilter = (item: ContentItem): boolean => {
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

  const filterCollections = (
    items: CollectionInfo[],
    query: string,
  ): CollectionInfo[] => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lowerQuery) ||
        item.name.toLowerCase().includes(lowerQuery) ||
        item.items.some((i) => i.name.toLowerCase().includes(lowerQuery)),
    );
  };

  const filteredCollections = filterCollections(collections, searchQuery);

  const selectedCollectionData = collections.find(
    (c) => c.name === selectedCollection,
  );
  const items = selectedCollectionData?.items || [];
  const filteredItems = items.filter((item) => {
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
      <div className="w-56 shrink-0 border-r border-neutral-100 bg-white flex flex-col">
        <div className="h-10 px-3 flex items-center border-b border-neutral-100">
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
                "bg-transparent",
                "focus:outline-none",
                "placeholder:text-neutral-400",
              ])}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCollections.map((collection) => {
            const isSelected = selectedCollection === collection.name;
            const isExpanded = expandedCollections.has(collection.name);

            return (
              <div key={collection.name}>
                <div
                  className={cn([
                    "flex items-center gap-1 py-1.5 px-2 cursor-pointer text-sm",
                    "hover:bg-neutral-100 transition-colors",
                    isSelected && "bg-neutral-100",
                  ])}
                  onClick={() => handleCollectionClick(collection.name)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollectionExpanded(collection.name);
                    }}
                    className="w-4 h-4 flex items-center justify-center"
                  >
                    <Icon
                      icon={
                        isExpanded ? "mdi:chevron-down" : "mdi:chevron-right"
                      }
                      className="text-neutral-400 text-xs"
                    />
                  </button>
                  <Icon
                    icon={isExpanded ? "mdi:folder-open" : "mdi:folder"}
                    className="text-neutral-400 text-sm"
                  />
                  <span className="truncate text-neutral-700">
                    {collection.label}
                  </span>
                  <span className="ml-auto text-xs text-neutral-400">
                    {collection.items.length}
                  </span>
                </div>
                {isExpanded && collection.items.length > 0 && (
                  <div>
                    {collection.items.slice(0, 10).map((item) => (
                      <div
                        key={item.path}
                        className={cn([
                          "flex items-center gap-1 py-1 pr-2 cursor-pointer text-sm",
                          "hover:bg-neutral-50 transition-colors",
                        ])}
                        style={{ paddingLeft: "32px" }}
                      >
                        <Icon
                          icon="mdi:file-document-outline"
                          className="text-neutral-400 text-sm"
                        />
                        <span className="truncate text-neutral-600 text-xs">
                          {item.name}
                        </span>
                      </div>
                    ))}
                    {collection.items.length > 10 && (
                      <div
                        className="text-xs text-neutral-400 py-1"
                        style={{ paddingLeft: "32px" }}
                      >
                        +{collection.items.length - 10} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedCollection && (
          <div className="p-2 border-t border-neutral-100">
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
        <div className="h-10 flex items-stretch border-b border-neutral-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn([
                "px-4 text-sm font-medium transition-colors",
                "border-r border-neutral-100",
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
          {!selectedCollection ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
              <Icon icon="mdi:folder-open-outline" className="text-4xl mb-3" />
              <p className="text-sm">Select a collection to view files</p>
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
                    "border border-transparent hover:border-neutral-100",
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
