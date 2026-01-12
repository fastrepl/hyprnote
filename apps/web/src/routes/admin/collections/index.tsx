import { MDXContent } from "@content-collections/mdx/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  allArticles,
  allChangelogs,
  allDocs,
  allHandbooks,
  allLegals,
  allTemplates,
} from "content-collections";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CopyIcon,
  CopyPlusIcon,
  DownloadIcon,
  EyeIcon,
  FilePlusIcon,
  FileTextIcon,
  FileWarningIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  GithubIcon,
  type LucideIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  ScissorsIcon,
  SearchIcon,
  SendIcon,
  SquareArrowOutUpRightIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BlogEditor from "@hypr/tiptap/blog-editor";
import "@hypr/tiptap/styles.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";
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
  meta_title?: string;
  display_title?: string;
  meta_description?: string;
  author?: string;
  date?: string;
  coverImage?: string;
  published?: boolean;
}

function getAllContent(): Map<string, FileContent> {
  const contentMap = new Map<string, FileContent>();

  allArticles.forEach((a) => {
    contentMap.set(`articles/${a._meta.fileName}`, {
      content: a.content,
      mdx: a.mdx,
      collection: "articles",
      slug: a.slug,
      meta_title: a.meta_title,
      display_title: a.display_title,
      meta_description: a.meta_description,
      author: a.author,
      date: a.date,
      coverImage: a.coverImage,
      published: a.published,
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
      prev.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t)),
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
    <ResizablePanelGroup direction="horizontal" className="h-full">
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
          onImportClick={() => setIsImportModalOpen(true)}
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

      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />
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
  onImportClick,
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
  onImportClick: () => void;
}) {
  return (
    <div className="h-full border-r border-neutral-200 bg-white flex flex-col min-h-0">
      <div className="h-10 pl-4 pr-2 flex items-center border-b border-neutral-200">
        <div className="relative w-full flex items-center gap-1.5">
          <SearchIcon className="size-4 text-neutral-400 shrink-0" />
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

      <button
        onClick={onImportClick}
        className={cn([
          "h-10 px-4 flex items-center gap-2 text-sm w-full",
          "text-neutral-600 hover:bg-neutral-50 transition-colors",
          "border-t border-neutral-200",
        ])}
      >
        <PlusIcon className="size-4" />
        Import
      </button>
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
        {isExpanded ? (
          <FolderOpenIcon className="size-4 text-neutral-400" />
        ) : (
          <FolderIcon className="size-4 text-neutral-400" />
        )}
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
      <FileTextIcon className="size-4 text-neutral-400" />
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
          icon={SquareArrowOutUpRightIcon}
          label="Open in new tab"
          onClick={() => {
            onOpenInNewTab();
            onClose();
          }}
        />
        <ContextMenuItem
          icon={DownloadIcon}
          label="Download"
          onClick={onDownload}
        />

        <div className="my-1 border-t border-neutral-200" />

        {isFolder && (
          <>
            <ContextMenuItem
              icon={FilePlusIcon}
              label="New file"
              onClick={onNewFile}
            />
            <ContextMenuItem
              icon={FolderPlusIcon}
              label="New folder"
              onClick={onNewFolder}
            />
            <div className="my-1 border-t border-neutral-200" />
          </>
        )}

        <ContextMenuItem icon={ScissorsIcon} label="Cut" onClick={onCut} />
        <ContextMenuItem icon={CopyIcon} label="Copy" onClick={onCopy} />
        <ContextMenuItem
          icon={CopyPlusIcon}
          label="Duplicate"
          onClick={onDuplicate}
        />
        <ContextMenuItem
          icon={ClipboardIcon}
          label="Paste"
          onClick={onPaste}
          disabled={!canPaste}
        />

        <div className="my-1 border-t border-neutral-200" />

        <ContextMenuItem icon={PencilIcon} label="Rename" onClick={onRename} />
        <ContextMenuItem
          icon={Trash2Icon}
          label="Delete"
          onClick={onDelete}
          danger
        />
      </div>
    </>
  );
}

function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: LucideIcon;
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
      <Icon className="size-4" />
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

  const currentFileContent =
    currentTab?.type === "file" ? contentMap.get(currentTab.path) : undefined;

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
            isPublished={currentFileContent?.published}
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
        <div className="flex-1 flex flex-col">
          <div className="h-10 border-b border-neutral-200" />
          <EmptyState
            icon={FolderOpenIcon}
            message="Double-click a collection or click a file to open"
          />
        </div>
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
  isPublished,
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
  isPublished?: boolean;
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
        <div className="flex-1 border-b border-neutral-200" />
      </div>

      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-200">
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRightIcon className="size-4 text-neutral-300" />
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
          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePreview}
              className={cn([
                "cursor-pointer p-1.5 rounded transition-colors",
                isPreviewMode
                  ? "text-neutral-700"
                  : "text-neutral-400 hover:text-neutral-600",
              ])}
              title={isPreviewMode ? "Edit mode" : "Preview mode"}
            >
              {isPreviewMode ? (
                <PencilIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
            <button
              type="button"
              className={cn([
                "px-2 py-1.5 text-xs font-medium font-mono rounded-sm flex items-center gap-1.5",
                isPublished
                  ? "text-white bg-green-600 hover:bg-green-700"
                  : "text-white bg-neutral-900 hover:bg-neutral-800",
              ])}
            >
              {isPublished ? (
                <>
                  <CheckIcon className="size-4" />
                  Published
                </>
              ) : (
                <>
                  <SendIcon className="size-4" />
                  Publish
                </>
              )}
            </button>
          </div>
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
          "border-r border-b border-neutral-200",
          tab.active
            ? "bg-white text-neutral-900 border-b-transparent"
            : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100",
        ])}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {tab.type === "collection" ? (
          <FolderIcon className="size-4 text-neutral-400" />
        ) : (
          <FileTextIcon className="size-4 text-neutral-400" />
        )}
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
          <XIcon className="size-3 text-neutral-500" />
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
          icon={XIcon}
          label="Close"
          onClick={() => {
            onCloseTab();
            onClose();
          }}
        />
        <ContextMenuItem
          icon={XIcon}
          label="Close others"
          onClick={() => {
            onCloseOthers();
            onClose();
          }}
        />
        <ContextMenuItem
          icon={XIcon}
          label="Close all"
          onClick={() => {
            onCloseAll();
            onClose();
          }}
        />
        <div className="my-1 border-t border-neutral-200" />
        <ContextMenuItem
          icon={isPinned ? PinOffIcon : PinIcon}
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
  if (filteredItems.length === 0) {
    return <EmptyState icon={FileTextIcon} message="No files found" />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-1">
        {filteredItems.map((item) => (
          <FileItem
            key={item.path}
            item={item}
            onClick={() => onFileClick(item)}
          />
        ))}
      </div>
    </div>
  );
}

const AUTHORS = [
  { name: "John Jeong", avatar: "/api/images/team/john.png" },
  { name: "Harshika", avatar: "/api/images/team/harshika.jpeg" },
  { name: "Yujong Lee", avatar: "/api/images/team/yujong.png" },
];

function AuthorSelect({
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
        className="w-full flex items-center gap-2 text-left text-neutral-900 cursor-pointer"
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
}

function MetadataPanel({
  fileContent,
  author,
  onAuthorChange,
  isExpanded,
  onToggleExpanded,
}: {
  fileContent: FileContent;
  author: string;
  onAuthorChange: (value: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
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
          isExpanded ? "max-h-96" : "max-h-0",
        ])}
      >
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setIsTitleExpanded(!isTitleExpanded)}
            className="w-24 shrink-0 px-4 py-2 text-neutral-500 flex items-center justify-between hover:text-neutral-700 relative"
          >
            <span className="absolute left-1 text-red-400">*</span>
            Title
            <ChevronRightIcon
              className={cn([
                "size-3 transition-transform",
                isTitleExpanded && "rotate-90",
              ])}
            />
          </button>
          <input
            type="text"
            defaultValue={fileContent.meta_title || ""}
            placeholder="SEO meta title"
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
          />
        </div>
        {isTitleExpanded && (
          <div className="flex border-b border-neutral-200 bg-neutral-50">
            <span className="w-24 shrink-0 px-4 py-2 text-neutral-400 flex items-center gap-1 relative">
              <span className="text-neutral-300">└</span>
              Display
            </span>
            <input
              type="text"
              defaultValue={fileContent.display_title || ""}
              placeholder="Display title (optional)"
              className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
          </div>
        )}
        <div className="flex border-b border-neutral-200">
          <span className="w-24 shrink-0 px-4 py-2 text-neutral-500 relative">
            <span className="absolute left-1 text-red-400">*</span>
            Author
          </span>
          <div className="flex-1 px-2 py-2">
            <AuthorSelect value={author} onChange={onAuthorChange} />
          </div>
        </div>
        <div className="flex border-b border-neutral-200">
          <span className="w-24 shrink-0 px-4 py-2 text-neutral-500 relative">
            <span className="absolute left-1 text-red-400">*</span>
            Date
          </span>
          <input
            type="date"
            defaultValue={fileContent.date || ""}
            className="flex-1 -ml-1 px-2 py-2 bg-transparent outline-none text-neutral-900"
          />
        </div>
        <div className="flex border-b border-neutral-200">
          <span className="w-24 shrink-0 px-4 py-2 text-neutral-500 relative">
            <span className="absolute left-1 text-red-400">*</span>
            Description
          </span>
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            defaultValue={fileContent.meta_description || ""}
            placeholder="Meta description for SEO"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300 resize-none"
          />
        </div>
        <div className="flex border-b border-neutral-200">
          <span className="w-24 shrink-0 px-4 py-2 text-neutral-500">
            Cover
          </span>
          <div className="flex-1 flex items-center gap-2 px-2 py-2">
            <input
              type="text"
              defaultValue={fileContent.coverImage || ""}
              placeholder="/api/images/blog/slug/cover.png"
              className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
            <button
              type="button"
              className="px-2 py-1 text-xs text-neutral-600 bg-neutral-100 rounded hover:bg-neutral-200"
            >
              Choose
            </button>
          </div>
        </div>
        <div className="flex">
          <span className="w-24 shrink-0 px-4 py-2 text-neutral-500">
            Featured
          </span>
          <div className="flex-1 flex items-center px-2 py-2">
            <input type="checkbox" defaultChecked={false} className="rounded" />
          </div>
        </div>
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
  const [author, setAuthor] = useState(fileContent?.author || "");
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(true);

  useEffect(() => {
    setContent(fileContent?.content || "");
  }, [filePath, fileContent?.content]);

  if (!fileContent) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <FileWarningIcon className="size-10 mb-3" />
          <p className="text-sm">File not found</p>
        </div>
      </div>
    );
  }

  const selectedAuthor = AUTHORS.find((a) => a.name === author);
  const avatarUrl = selectedAuthor?.avatar;

  if (isPreviewMode) {
    return (
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <MetadataPanel
              fileContent={fileContent}
              author={author}
              onAuthorChange={setAuthor}
              isExpanded={isMetadataExpanded}
              onToggleExpanded={() =>
                setIsMetadataExpanded(!isMetadataExpanded)
              }
            />
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <BlogEditor content={content} onChange={setContent} />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle className="w-px bg-neutral-200" />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto bg-white">
            <header className="py-12 text-center max-w-3xl mx-auto px-6">
              <h1 className="text-3xl font-serif text-stone-600 mb-6">
                {fileContent.display_title ||
                  fileContent.meta_title ||
                  "Untitled"}
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
              {fileContent.date && (
                <time className="text-xs font-mono text-neutral-500">
                  {new Date(fileContent.date).toLocaleDateString("en-US", {
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
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0">
        <MetadataPanel
          fileContent={fileContent}
          author={author}
          onAuthorChange={setAuthor}
          isExpanded={isMetadataExpanded}
          onToggleExpanded={() => setIsMetadataExpanded(!isMetadataExpanded)}
        />
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <BlogEditor content={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
      <Icon className="size-10 mb-3" />
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
        "border border-transparent hover:border-neutral-200",
      ])}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <FileTextIcon className="size-4 text-neutral-400" />
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
        <GithubIcon className="size-4" />
      </a>
    </div>
  );
}

const CONTENT_FOLDERS = [
  { value: "articles", label: "Articles (Blog)" },
  { value: "changelog", label: "Changelog" },
  { value: "docs", label: "Documentation" },
  { value: "handbook", label: "Handbook" },
  { value: "legal", label: "Legal" },
  { value: "templates", label: "Templates" },
];

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

interface ImportParams {
  url: string;
  title?: string;
  author?: string;
  description?: string;
  coverImage?: string;
  slug?: string;
}

async function importFromGoogleDocs(
  params: ImportParams,
): Promise<ImportResult> {
  const response = await fetch("/api/admin/import/google-docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: params.url,
      title: params.title || undefined,
      author: params.author || undefined,
      description: params.description || undefined,
      coverImage: params.coverImage || undefined,
      slug: params.slug || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(
        errorData.error || `Import failed with status ${response.status}`,
      );
    } catch {
      throw new Error(
        `Import failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  const data: ImportResult = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Import failed");
  }

  return data;
}

interface SaveParams {
  content: string;
  filename: string;
  folder: string;
}

async function saveToRepository(params: SaveParams): Promise<SaveResult> {
  const response = await fetch("/api/admin/import/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: params.content,
      filename: params.filename,
      folder: params.folder,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(
        errorData.error || `Save failed with status ${response.status}`,
      );
    } catch {
      throw new Error(`Save failed: ${response.status} ${response.statusText}`);
    }
  }

  const data: SaveResult = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Save failed");
  }

  return data;
}

function ImportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [slug, setSlug] = useState("");
  const [folder, setFolder] = useState("articles");
  const [editedMdx, setEditedMdx] = useState("");

  const importMutation = useMutation({
    mutationFn: importFromGoogleDocs,
    onSuccess: (data) => {
      setEditedMdx(data.mdx || "");
      if (data.frontmatter) {
        if (!title) setTitle(data.frontmatter.meta_title);
        if (!author) setAuthor(data.frontmatter.author);
        if (!description) setDescription(data.frontmatter.meta_description);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: saveToRepository,
    onSuccess: () => {
      setUrl("");
      setTitle("");
      setAuthor("");
      setDescription("");
      setCoverImage("");
      setSlug("");
      setEditedMdx("");
      importMutation.reset();
    },
  });

  const handleImport = () => {
    if (!url) return;
    saveMutation.reset();
    importMutation.mutate({
      url,
      title: title || undefined,
      author: author || undefined,
      description: description || undefined,
      coverImage: coverImage || undefined,
      slug: slug || undefined,
    });
  };

  const handleSave = () => {
    if (!editedMdx || !slug) return;
    const filename = slug.endsWith(".mdx") ? slug : `${slug}.mdx`;
    saveMutation.mutate({ content: editedMdx, filename, folder });
  };

  const error = importMutation.error || saveMutation.error;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Google Docs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            The document must be either published to the web or shared with
            "Anyone with the link can view" permissions.
          </p>

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
                Title (optional)
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
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importMutation.isPending || !url}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {importMutation.isPending ? "Importing..." : "Import Document"}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error instanceof Error ? error.message : "An error occurred"}
            </div>
          )}

          {importMutation.data && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Generated MDX Content
                </label>
                <textarea
                  value={editedMdx}
                  onChange={(e) => setEditedMdx(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Folder
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
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !editedMdx || !slug}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : "Save to Repository"}
                </button>
              </div>
            </div>
          )}

          {saveMutation.data && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              <p className="font-medium">File saved successfully!</p>
              <p className="mt-1">
                Path:{" "}
                <code className="bg-green-100 px-1 rounded">
                  {saveMutation.data.path}
                </code>
              </p>
              {saveMutation.data.url && (
                <a
                  href={saveMutation.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 underline"
                >
                  View on GitHub
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
