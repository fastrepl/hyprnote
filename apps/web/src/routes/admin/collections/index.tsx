import { MDXContent } from "@content-collections/mdx/react";
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
import { EyeIcon, PencilIcon } from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";

import BlogEditor from "@hypr/tiptap/blog-editor";
import "@hypr/tiptap/styles.css";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { cn } from "@hypr/utils";

import { CtaCard } from "@/components/cta-card";
import { createMDXComponents } from "@/components/mdx";

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

interface Tab {
  id: string;
  type: "collection" | "file";
  name: string;
  path: string;
  pinned: boolean;
  active: boolean;
}

interface ClipboardItem {
  item: ContentItem | CollectionInfo;
  operation: "cut" | "copy";
}

interface FileContent {
  content: string;
  mdx: string;
  collection: string;
  slug: string;
}

function getAllContent(): Map<string, FileContent> {
  const contentMap = new Map<string, FileContent>();

  allArticles.forEach((a) => {
    contentMap.set(`articles/${a._meta.fileName}`, {
      content: a.content,
      mdx: a.mdx,
      collection: "articles",
      slug: a.slug,
    });
  });

  allChangelogs.forEach((c) => {
    contentMap.set(`changelog/${c._meta.fileName}`, {
      content: c.content,
      mdx: c.mdx,
      collection: "changelog",
      slug: c.slug,
    });
  });

  allDocs.forEach((d) => {
    contentMap.set(`docs/${d._meta.path}`, {
      content: d.content,
      mdx: d.mdx,
      collection: "docs",
      slug: d.slug,
    });
  });

  allHandbooks.forEach((h) => {
    contentMap.set(`handbook/${h._meta.path}`, {
      content: h.content,
      mdx: h.mdx,
      collection: "handbook",
      slug: h.slug,
    });
  });

  allLegals.forEach((l) => {
    contentMap.set(`legal/${l._meta.fileName}`, {
      content: l.content,
      mdx: l.mdx,
      collection: "legal",
      slug: l.slug,
    });
  });

  allTemplates.forEach((t) => {
    contentMap.set(`templates/${t._meta.fileName}`, {
      content: t.content,
      mdx: t.mdx,
      collection: "templates",
      slug: t.slug,
    });
  });

  return contentMap;
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

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

function CollectionsPage() {
  const collections = getCollections();
  const contentMap = useMemo(() => getAllContent(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(),
  );
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  const currentTab = tabs.find((t) => t.active);

  const openTab = useCallback(
    (
      type: "collection" | "file",
      name: string,
      path: string,
      pinned = false,
    ) => {
      setTabs((prev) => {
        const existingIndex = prev.findIndex(
          (t) => t.type === type && t.path === path,
        );
        if (existingIndex !== -1) {
          return prev.map((t, i) => ({ ...t, active: i === existingIndex }));
        }

        const unpinnedIndex = prev.findIndex((t) => !t.pinned);
        const newTab: Tab = {
          id: `${type}-${path}-${Date.now()}`,
          type,
          name,
          path,
          pinned,
          active: true,
        };

        if (unpinnedIndex !== -1) {
          return prev.map((t, i) =>
            i === unpinnedIndex ? newTab : { ...t, active: false },
          );
        }

        return [...prev.map((t) => ({ ...t, active: false })), newTab];
      });
    },
    [],
  );

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === tabId);
      if (index === -1) return prev;

      const newTabs = prev.filter((t) => t.id !== tabId);
      if (newTabs.length === 0) return [];

      if (prev[index].active) {
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        return newTabs.map((t, i) => ({ ...t, active: i === newActiveIndex }));
      }
      return newTabs;
    });
  }, []);

  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (!tab) return prev;
      return [{ ...tab, active: true }];
    });
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
  }, []);

  const selectTab = useCallback((tabId: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === tabId })));
  }, []);

  const pinTab = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, pinned: true } : t)),
    );
  }, []);

  const reorderTabs = useCallback((newTabs: Tab[]) => {
    setTabs(newTabs);
  }, []);

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

  const currentCollection =
    currentTab?.type === "collection"
      ? collections.find((c) => c.name === currentTab.path)
      : null;

  const filteredItems =
    currentCollection?.items.filter((item) => {
      return (
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }) || [];

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-[calc(100vh-64px)]"
    >
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
        <Sidebar
          collections={filteredCollections}
          expandedCollections={expandedCollections}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCollectionClick={(name) => toggleCollectionExpanded(name)}
          onCollectionDoubleClick={(collection) =>
            openTab("collection", collection.label, collection.name)
          }
          onFileClick={(item) => openTab("file", item.name, item.path)}
          clipboard={clipboard}
          onClipboardChange={setClipboard}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={80} minSize={50}>
        <ContentPanel
          tabs={tabs}
          currentTab={currentTab}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onCloseOtherTabs={closeOtherTabs}
          onCloseAllTabs={closeAllTabs}
          onPinTab={pinTab}
          onReorderTabs={reorderTabs}
          filteredItems={filteredItems}
          onFileClick={(item) => openTab("file", item.name, item.path)}
          contentMap={contentMap}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function Sidebar({
  collections,
  expandedCollections,
  searchQuery,
  onSearchChange,
  onCollectionClick,
  onCollectionDoubleClick,
  onFileClick,
  clipboard,
  onClipboardChange,
}: {
  collections: CollectionInfo[];
  expandedCollections: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCollectionClick: (name: string) => void;
  onCollectionDoubleClick: (collection: CollectionInfo) => void;
  onFileClick: (item: ContentItem) => void;
  clipboard: ClipboardItem | null;
  onClipboardChange: (item: ClipboardItem | null) => void;
}) {
  return (
    <div className="h-full border-r border-neutral-100 bg-white flex flex-col">
      <div className="h-10 pl-4 pr-2 flex items-center border-b border-neutral-100">
        <div className="relative w-full flex items-center gap-1.5">
          <Icon
            icon="mdi:magnify"
            className="text-neutral-400 text-sm shrink-0"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className={cn([
              "w-full py-1 text-sm",
              "bg-transparent",
              "focus:outline-none",
              "placeholder:text-neutral-400",
            ])}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {collections.map((collection) => {
          const isExpanded = expandedCollections.has(collection.name);

          return (
            <CollectionItem
              key={collection.name}
              collection={collection}
              isExpanded={isExpanded}
              onClick={() => onCollectionClick(collection.name)}
              onDoubleClick={() => onCollectionDoubleClick(collection)}
              onFileClick={onFileClick}
              clipboard={clipboard}
              onClipboardChange={onClipboardChange}
            />
          );
        })}
      </div>

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
    </div>
  );
}

function CollectionItem({
  collection,
  isExpanded,
  onClick,
  onDoubleClick,
  onFileClick,
  clipboard,
  onClipboardChange,
}: {
  collection: CollectionInfo;
  isExpanded: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onFileClick: (item: ContentItem) => void;
  clipboard: ClipboardItem | null;
  onClipboardChange: (item: ClipboardItem | null) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div>
      <div
        className={cn([
          "flex items-center gap-1.5 py-1.5 pl-4 pr-2 cursor-pointer text-sm",
          "hover:bg-neutral-100 transition-colors",
        ])}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Icon
          icon={isExpanded ? "mdi:folder-open" : "mdi:folder"}
          className="text-neutral-400 text-sm"
        />
        <span className="truncate text-neutral-700">{collection.label}</span>
        <span className="ml-auto text-xs text-neutral-400">
          {collection.items.length}
        </span>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          isFolder
          canPaste={clipboard !== null}
          onOpenInNewTab={onDoubleClick}
          onDownload={() => {
            closeContextMenu();
          }}
          onNewFile={() => {
            closeContextMenu();
          }}
          onNewFolder={() => {
            closeContextMenu();
          }}
          onCut={() => {
            onClipboardChange({ item: collection, operation: "cut" });
            closeContextMenu();
          }}
          onCopy={() => {
            onClipboardChange({ item: collection, operation: "copy" });
            closeContextMenu();
          }}
          onDuplicate={() => {
            closeContextMenu();
          }}
          onPaste={() => {
            onClipboardChange(null);
            closeContextMenu();
          }}
          onRename={() => {
            closeContextMenu();
          }}
          onDelete={() => {
            closeContextMenu();
          }}
        />
      )}

      {isExpanded && collection.items.length > 0 && (
        <div className="ml-5.5 border-l border-neutral-200">
          {collection.items.slice(0, 10).map((item) => (
            <FileItemSidebar
              key={item.path}
              item={item}
              onClick={() => onFileClick(item)}
              clipboard={clipboard}
              onClipboardChange={onClipboardChange}
            />
          ))}
          {collection.items.length > 10 && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 py-1 pl-3">
              +{collection.items.length - 10} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileItemSidebar({
  item,
  onClick,
  clipboard,
  onClipboardChange,
}: {
  item: ContentItem;
  onClick: () => void;
  clipboard: ClipboardItem | null;
  onClipboardChange: (item: ClipboardItem | null) => void;
}) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div
      className={cn([
        "flex items-center gap-1.5 py-1 pl-3 pr-2 cursor-pointer text-sm",
        "hover:bg-neutral-50 transition-colors",
      ])}
      onClick={onClick}
      onContextMenu={handleContextMenu}
    >
      <Icon
        icon="mdi:file-document-outline"
        className="text-neutral-400 text-sm"
      />
      <span className="truncate text-neutral-600 text-xs">{item.name}</span>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          isFolder={false}
          canPaste={clipboard !== null}
          onOpenInNewTab={onClick}
          onDownload={() => {
            window.open(
              `https://github.com/fastrepl/hyprnote/blob/main/apps/web/content/${item.path}`,
              "_blank",
            );
            closeContextMenu();
          }}
          onNewFile={() => {
            closeContextMenu();
          }}
          onNewFolder={() => {
            closeContextMenu();
          }}
          onCut={() => {
            onClipboardChange({ item, operation: "cut" });
            closeContextMenu();
          }}
          onCopy={() => {
            onClipboardChange({ item, operation: "copy" });
            closeContextMenu();
          }}
          onDuplicate={() => {
            closeContextMenu();
          }}
          onPaste={() => {
            onClipboardChange(null);
            closeContextMenu();
          }}
          onRename={() => {
            closeContextMenu();
          }}
          onDelete={() => {
            closeContextMenu();
          }}
        />
      )}
    </div>
  );
}

function ContextMenu({
  x,
  y,
  onClose,
  isFolder,
  canPaste,
  onOpenInNewTab,
  onDownload,
  onNewFile,
  onNewFolder,
  onCut,
  onCopy,
  onDuplicate,
  onPaste,
  onRename,
  onDelete,
}: {
  x: number;
  y: number;
  onClose: () => void;
  isFolder: boolean;
  canPaste: boolean;
  onOpenInNewTab: () => void;
  onDownload: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onCut: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onPaste: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className={cn([
          "fixed z-50 min-w-40 py-1",
          "bg-white border border-neutral-200 rounded-sm shadow-lg",
        ])}
        style={{ left: x, top: y }}
      >
        <ContextMenuItem
          icon="mdi:tab-plus"
          label="Open in new tab"
          onClick={() => {
            onOpenInNewTab();
            onClose();
          }}
        />
        <ContextMenuItem
          icon="mdi:download"
          label="Download"
          onClick={onDownload}
        />

        <div className="my-1 border-t border-neutral-100" />

        {isFolder && (
          <>
            <ContextMenuItem
              icon="mdi:file-plus-outline"
              label="New file"
              onClick={onNewFile}
            />
            <ContextMenuItem
              icon="mdi:folder-plus-outline"
              label="New folder"
              onClick={onNewFolder}
            />
            <div className="my-1 border-t border-neutral-100" />
          </>
        )}

        <ContextMenuItem icon="mdi:content-cut" label="Cut" onClick={onCut} />
        <ContextMenuItem
          icon="mdi:content-copy"
          label="Copy"
          onClick={onCopy}
        />
        <ContextMenuItem
          icon="mdi:content-duplicate"
          label="Duplicate"
          onClick={onDuplicate}
        />
        <ContextMenuItem
          icon="mdi:content-paste"
          label="Paste"
          onClick={onPaste}
          disabled={!canPaste}
        />

        <div className="my-1 border-t border-neutral-100" />

        <ContextMenuItem icon="mdi:rename" label="Rename" onClick={onRename} />
        <ContextMenuItem
          icon="mdi:delete-outline"
          label="Delete"
          onClick={onDelete}
          danger
        />
      </div>
    </>
  );
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn([
        "w-full px-3 py-1.5 text-sm text-left flex items-center gap-2",
        "hover:bg-neutral-100 transition-colors",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
        danger && "text-red-600 hover:bg-red-50",
      ])}
    >
      <Icon icon={icon} className="text-base" />
      {label}
    </button>
  );
}

function ContentPanel({
  tabs,
  currentTab,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onPinTab,
  onReorderTabs,
  filteredItems,
  onFileClick,
  contentMap,
}: {
  tabs: Tab[];
  currentTab: Tab | undefined;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
  onPinTab: (tabId: string) => void;
  onReorderTabs: (tabs: Tab[]) => void;
  filteredItems: ContentItem[];
  onFileClick: (item: ContentItem) => void;
  contentMap: Map<string, FileContent>;
}) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {currentTab ? (
        <>
          <EditorHeader
            tabs={tabs}
            currentTab={currentTab}
            onSelectTab={onSelectTab}
            onCloseTab={onCloseTab}
            onCloseOtherTabs={onCloseOtherTabs}
            onCloseAllTabs={onCloseAllTabs}
            onPinTab={onPinTab}
            onReorderTabs={onReorderTabs}
            isPreviewMode={isPreviewMode}
            onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
          />
          {currentTab.type === "collection" ? (
            <FileList filteredItems={filteredItems} onFileClick={onFileClick} />
          ) : (
            <FileEditor
              filePath={currentTab.path}
              contentMap={contentMap}
              isPreviewMode={isPreviewMode}
            />
          )}
        </>
      ) : (
        <>
          <div className="h-10 border-b border-neutral-100" />
          <EmptyState
            icon="mdi:folder-open-outline"
            message="Double-click a collection or click a file to open"
          />
        </>
      )}
    </div>
  );
}

function EditorHeader({
  tabs,
  currentTab,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onPinTab,
  onReorderTabs,
  isPreviewMode,
  onTogglePreview,
}: {
  tabs: Tab[];
  currentTab: Tab;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
  onPinTab: (tabId: string) => void;
  onReorderTabs: (tabs: Tab[]) => void;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}) {
  const breadcrumbs = currentTab.path.split("/");

  return (
    <div>
      <div className="flex items-end">
        <TabBar
          tabs={tabs}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onCloseOtherTabs={onCloseOtherTabs}
          onCloseAllTabs={onCloseAllTabs}
          onPinTab={onPinTab}
          onReorderTabs={onReorderTabs}
        />
        <div className="flex-1 border-b border-neutral-100" />
      </div>

      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-100">
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && (
                <Icon icon="mdi:chevron-right" className="text-neutral-300" />
              )}
              <span
                className={cn([
                  index === breadcrumbs.length - 1
                    ? "text-neutral-700 font-medium"
                    : "hover:text-neutral-700 cursor-pointer",
                ])}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {currentTab.type === "file" && (
          <button
            onClick={onTogglePreview}
            className={cn([
              "cursor-pointer p-1.5 rounded transition-colors",
              isPreviewMode
                ? "bg-neutral-100 text-neutral-700"
                : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50",
            ])}
            title={isPreviewMode ? "Edit mode" : "Preview mode"}
          >
            {isPreviewMode ? (
              <PencilIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function TabBar({
  tabs,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onPinTab,
  onReorderTabs,
}: {
  tabs: Tab[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
  onPinTab: (tabId: string) => void;
  onReorderTabs: (tabs: Tab[]) => void;
}) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-end overflow-x-auto">
      <Reorder.Group
        as="div"
        axis="x"
        values={tabs}
        onReorder={onReorderTabs}
        className="flex items-end"
      >
        {tabs.map((tab) => (
          <Reorder.Item key={tab.id} value={tab} as="div">
            <TabItem
              tab={tab}
              onSelect={() => onSelectTab(tab.id)}
              onClose={() => onCloseTab(tab.id)}
              onCloseOthers={() => onCloseOtherTabs(tab.id)}
              onCloseAll={onCloseAllTabs}
              onPin={() => onPinTab(tab.id)}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

function TabItem({
  tab,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseAll,
  onPin,
}: {
  tab: Tab;
  onSelect: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onPin: () => void;
}) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = () => {
    if (!tab.pinned) {
      onPin();
    }
  };

  return (
    <>
      <div
        className={cn([
          "h-10 px-3 flex items-center gap-2 cursor-pointer text-sm transition-colors",
          "border-r border-b border-neutral-100",
          tab.active
            ? "bg-white text-neutral-900 border-b-transparent"
            : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100",
        ])}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Icon
          icon={
            tab.type === "collection"
              ? "mdi:folder"
              : "mdi:file-document-outline"
          }
          className="text-neutral-400 text-sm"
        />
        <span className={cn(["truncate max-w-30", !tab.pinned && "italic"])}>
          {tab.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-0.5 hover:bg-neutral-200 rounded transition-colors"
        >
          <Icon icon="mdi:close" className="text-xs text-neutral-500" />
        </button>
      </div>

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCloseTab={onClose}
          onCloseOthers={onCloseOthers}
          onCloseAll={onCloseAll}
          onPinTab={onPin}
          isPinned={tab.pinned}
        />
      )}
    </>
  );
}

function TabContextMenu({
  x,
  y,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  isPinned,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onPinTab: () => void;
  isPinned: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn([
          "fixed z-50 min-w-35 py-1",
          "bg-white border border-neutral-200 rounded-sm shadow-lg",
        ])}
        style={{ left: x, top: y }}
      >
        <ContextMenuItem
          icon="mdi:close"
          label="Close"
          onClick={() => {
            onCloseTab();
            onClose();
          }}
        />
        <ContextMenuItem
          icon="mdi:close-box-multiple-outline"
          label="Close others"
          onClick={() => {
            onCloseOthers();
            onClose();
          }}
        />
        <ContextMenuItem
          icon="mdi:close-box-outline"
          label="Close all"
          onClick={() => {
            onCloseAll();
            onClose();
          }}
        />
        <div className="my-1 border-t border-neutral-100" />
        <ContextMenuItem
          icon={isPinned ? "mdi:pin-off" : "mdi:pin"}
          label={isPinned ? "Unpin tab" : "Pin tab"}
          onClick={() => {
            onPinTab();
            onClose();
          }}
        />
      </div>
    </>
  );
}

function FileList({
  filteredItems,
  onFileClick,
}: {
  filteredItems: ContentItem[];
  onFileClick: (item: ContentItem) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {filteredItems.length === 0 ? (
        <EmptyState icon="mdi:file-document-outline" message="No files found" />
      ) : (
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <FileItem
              key={item.path}
              item={item}
              onClick={() => onFileClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileEditor({
  filePath,
  contentMap,
  isPreviewMode,
}: {
  filePath: string;
  contentMap: Map<string, FileContent>;
  isPreviewMode: boolean;
}) {
  const fileContent = contentMap.get(filePath);
  const [content, setContent] = useState(fileContent?.content || "");

  if (!fileContent) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <Icon icon="mdi:file-alert-outline" className="text-4xl mb-3" />
          <p className="text-sm">File not found</p>
        </div>
      </div>
    );
  }

  if (isPreviewMode) {
    return (
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto p-6">
            <BlogEditor content={content} onChange={setContent} />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8">
              <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:my-8 max-w-none">
                <MDXContent
                  code={fileContent.mdx}
                  components={createMDXComponents({ CtaCard })}
                />
              </article>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <BlogEditor content={content} onChange={setContent} />
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-64 text-neutral-500">
      <Icon icon={icon} className="text-4xl mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function FileItem({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  return (
    <div
      className={cn([
        "flex items-center justify-between px-3 py-2 rounded cursor-pointer",
        "hover:bg-neutral-50 transition-colors",
        "border border-transparent hover:border-neutral-100",
      ])}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Icon icon="mdi:file-document-outline" className="text-neutral-400" />
        <span className="text-sm text-neutral-700">{item.name}</span>
        <span className="text-xs text-neutral-400 px-1.5 py-0.5 bg-neutral-100 rounded">
          {getFileExtension(item.name).toUpperCase()}
        </span>
      </div>
      <a
        href={`https://github.com/fastrepl/hyprnote/blob/main/apps/web/content/${item.path}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:text-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon icon="mdi:github" className="text-base" />
      </a>
    </div>
  );
}
