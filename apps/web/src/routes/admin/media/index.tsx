import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
  MoreVerticalIcon,
  PinIcon,
  PinOffIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Reorder } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import {
  ScrollFadeOverlay,
  useScrollFade,
} from "@hypr/ui/components/ui/scroll-fade";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

interface MediaItem {
  name: string;
  path: string;
  publicUrl: string;
  id: string;
  size: number;
  type: "file" | "dir";
  mimeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface TreeNode {
  path: string;
  name: string;
  type: "file" | "dir";
  expanded: boolean;
  loaded: boolean;
  children: TreeNode[];
}

interface Tab {
  id: string;
  type: "folder" | "file";
  name: string;
  path: string;
  pinned: boolean;
  active: boolean;
  isHome?: boolean;
}

async function fetchMediaItems(path: string): Promise<MediaItem[]> {
  const response = await fetch(
    `/api/admin/media/list?path=${encodeURIComponent(path)}`,
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch media");
  }
  return data.items;
}

async function uploadFile(params: {
  filename: string;
  content: string;
  folder: string;
}) {
  const response = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Upload failed");
  }
  return response.json();
}

async function deleteFiles(paths: string[]) {
  const response = await fetch("/api/admin/media/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });

  const data = await response.json();
  if (data.errors && data.errors.length > 0) {
    throw new Error(`Some files failed to delete: ${data.errors.join(", ")}`);
  }
  return data;
}

export const Route = createFileRoute("/admin/media/")({
  component: MediaLibrary,
});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getRelativePath(fullPath: string): string {
  return fullPath;
}

function MediaLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const rootQuery = useQuery({
    queryKey: ["mediaItems", ""],
    queryFn: () => fetchMediaItems(""),
    enabled: isMounted,
  });

  useEffect(() => {
    if (rootQuery.data && !rootLoaded) {
      const children: TreeNode[] = rootQuery.data.map((item) => ({
        path: getRelativePath(item.path),
        name: item.name,
        type: item.type,
        expanded: false,
        loaded: false,
        children: [],
      }));
      setTreeNodes(children);
      setRootLoaded(true);

      // Add permanent Home tab
      setTabs([
        {
          id: "home",
          type: "folder",
          name: "Home",
          path: "",
          pinned: true,
          active: true,
          isHome: true,
        },
      ]);
    }
  }, [rootQuery.data, rootLoaded]);

  const currentTab = tabs.find((t) => t.active);

  const currentPathQuery = useQuery({
    queryKey: ["mediaItems", currentTab?.path || "", currentTab?.type],
    queryFn: async () => {
      if (currentTab?.type === "file") {
        const parentPath = currentTab.path.split("/").slice(0, -1).join("/");
        const items = await fetchMediaItems(parentPath);
        return items.filter((i) => i.path === currentTab.path);
      }
      return fetchMediaItems(currentTab?.path || "");
    },
    enabled: isMounted && currentTab !== undefined,
  });

  const loadFolderContents = async (path: string) => {
    setLoadingPaths((prev) => new Set(prev).add(path));
    try {
      const items = await queryClient.fetchQuery({
        queryKey: ["mediaItems", path],
        queryFn: () => fetchMediaItems(path),
      });
      const children: TreeNode[] = items.map((item) => ({
        path: getRelativePath(item.path),
        name: item.name,
        type: item.type,
        expanded: false,
        loaded: false,
        children: [],
      }));

      if (path === "") {
        setTreeNodes(children);
        setRootLoaded(true);
      } else {
        setTreeNodes((prev) => updateTreeNode(prev, path, children));
      }
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  const updateTreeNode = (
    nodes: TreeNode[],
    targetPath: string,
    children: TreeNode[],
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children, loaded: true };
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateTreeNode(node.children, targetPath, children),
        };
      }
      return node;
    });
  };

  const toggleNodeExpanded = async (path: string) => {
    const node = findNode(treeNodes, path);
    if (!node) return;

    const willExpand = !node.expanded;
    if (willExpand && !node.loaded && node.type === "dir") {
      await loadFolderContents(path);
    }
    setTreeNodes((prev) => toggleExpanded(prev, path));
  };

  const findNode = (nodes: TreeNode[], path: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children.length > 0) {
        const found = findNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleExpanded = (nodes: TreeNode[], path: string): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === path) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children.length > 0) {
        return { ...node, children: toggleExpanded(node.children, path) };
      }
      return node;
    });
  };

  const openTab = useCallback(
    (type: "folder" | "file", name: string, path: string, pinned = false) => {
      setTabs((prev) => {
        // If opening the home/root folder, just activate the Home tab
        if (type === "folder" && path === "") {
          return prev.map((t) => ({ ...t, active: t.isHome === true }));
        }

        const existingIndex = prev.findIndex(
          (t) => t.type === type && t.path === path,
        );
        if (existingIndex !== -1) {
          return prev.map((t, i) => ({ ...t, active: i === existingIndex }));
        }

        const unpinnedIndex = prev.findIndex((t) => !t.pinned && !t.isHome);
        const newTab: Tab = {
          id: `${type}-${path}-${Date.now()}`,
          type,
          name,
          path,
          pinned,
          active: true,
        };

        if (unpinnedIndex !== -1 && prev.length > 0) {
          return prev.map((t, i) =>
            i === unpinnedIndex ? newTab : { ...t, active: false },
          );
        }

        return [...prev.map((t) => ({ ...t, active: false })), newTab];
      });
      setSelectedItems(new Set());
    },
    [],
  );

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === tabId);
      if (index === -1) return prev;

      // Don't allow closing the Home tab
      if (prev[index].isHome) return prev;

      const newTabs = prev.filter((t) => t.id !== tabId);
      if (newTabs.length === 0) return [];

      if (prev[index].active) {
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        return newTabs.map((t, i) => ({ ...t, active: i === newActiveIndex }));
      }
      return newTabs;
    });
  }, []);

  const selectTab = useCallback((tabId: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === tabId })));
    setSelectedItems(new Set());
  }, []);

  const pinTab = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t)),
    );
  }, []);

  const reorderTabs = useCallback((newTabs: Tab[]) => {
    setTabs(newTabs);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const folder = currentTab?.type === "folder" ? currentTab.path : "";
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadFile({
          filename: file.name,
          content,
          folder,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
      if (currentTab?.type === "folder") {
        loadFolderContents(currentTab.path);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteFiles(paths),
    onSuccess: () => {
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
      if (currentTab?.type === "folder") {
        loadFolderContents(currentTab.path);
      }
    },
  });

  const replaceMutation = useMutation({
    mutationFn: async (params: { file: File; path: string }) => {
      const reader = new FileReader();
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(params.file);
      });

      await uploadFile({
        filename: params.file.name,
        content,
        folder: params.path.split("/").slice(0, -1).join("/"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
      if (currentTab?.type === "folder") {
        loadFolderContents(currentTab.path);
      }
    },
  });

  const handleUpload = (files: FileList) => {
    uploadMutation.mutate(files);
  };

  const handleDelete = () => {
    if (selectedItems.size === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)
    )
      return;
    deleteMutation.mutate(Array.from(selectedItems));
  };

  const handleDownload = (publicUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = publicUrl;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSelected = () => {
    const currentItems = currentPathQuery.data || [];
    selectedItems.forEach((path) => {
      const item = currentItems.find((i) => i.path === path);
      if (item && item.type === "file") {
        handleDownload(item.publicUrl, item.name);
      }
    });
  };

  const handleReplace = (file: File, path: string) => {
    replaceMutation.mutate({ file, path });
  };

  const handleDeleteSingle = (path: string) => {
    if (!confirm(`Are you sure you want to delete this file?`)) return;
    deleteMutation.mutate([path]);
  };

  const toggleSelection = (path: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedItems(newSelection);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const filterTreeNodes = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();

    return nodes
      .map((node) => {
        const matchesName = node.name.toLowerCase().includes(lowerQuery);
        const filteredChildren = filterTreeNodes(node.children, query);

        if (matchesName || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren, expanded: true };
        }
        return null;
      })
      .filter((node): node is TreeNode => node !== null);
  };

  const filteredTreeNodes = filterTreeNodes(treeNodes, searchQuery);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-[calc(100vh-64px)]"
    >
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
        <Sidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loadingPaths={loadingPaths}
          filteredTreeNodes={filteredTreeNodes}
          onOpenFolder={(path, name) => openTab("folder", name, path)}
          onOpenFile={(path, name) => openTab("file", name, path)}
          onToggleNodeExpanded={toggleNodeExpanded}
          uploadPending={uploadMutation.isPending}
          fileInputRef={fileInputRef}
          onUpload={handleUpload}
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={80} minSize={50}>
        <ContentPanel
          tabs={tabs}
          currentTab={currentTab}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onPinTab={pinTab}
          onReorderTabs={reorderTabs}
          selectedItems={selectedItems}
          onDelete={handleDelete}
          onDownloadSelected={handleDownloadSelected}
          onClearSelection={() => setSelectedItems(new Set())}
          deletePending={deleteMutation.isPending}
          dragOver={dragOver}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          isLoading={currentPathQuery.isLoading}
          error={currentPathQuery.error}
          items={currentPathQuery.data || []}
          onToggleSelection={toggleSelection}
          onCopyToClipboard={copyToClipboard}
          onDownload={handleDownload}
          onReplace={handleReplace}
          onDeleteSingle={handleDeleteSingle}
          onOpenPreview={(path, name) => openTab("file", name, path)}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function Sidebar({
  searchQuery,
  onSearchChange,
  loadingPaths,
  filteredTreeNodes,
  onOpenFolder,
  onOpenFile,
  onToggleNodeExpanded,
  uploadPending,
  fileInputRef,
  onUpload,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loadingPaths: Set<string>;
  filteredTreeNodes: TreeNode[];
  onOpenFolder: (path: string, name: string) => void;
  onOpenFile: (path: string, name: string) => void;
  onToggleNodeExpanded: (path: string) => Promise<void>;
  uploadPending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (files: FileList) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { atStart, atEnd } = useScrollFade(scrollRef, "vertical", [
    filteredTreeNodes,
  ]);

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
              "focus:outline-hidden",
              "placeholder:text-neutral-400",
            ])}
          />
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
        <div ref={scrollRef} className="h-full overflow-y-auto">
          {filteredTreeNodes.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              loadingPaths={loadingPaths}
              onOpenFolder={onOpenFolder}
              onOpenFile={onOpenFile}
              onToggle={onToggleNodeExpanded}
            />
          ))}
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPending}
          className={cn([
            "w-full h-9 text-sm font-medium rounded-full flex items-center justify-center gap-2",
            "bg-linear-to-b from-white to-neutral-100 text-neutral-700 border border-neutral-200",
            "shadow-xs hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all",
            "disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-xs",
          ])}
        >
          {uploadPending && <Spinner size={14} />}
          {uploadPending ? "Uploading..." : "+ Add"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
      </div>
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  loadingPaths,
  onOpenFolder,
  onOpenFile,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  loadingPaths: Set<string>;
  onOpenFolder: (path: string, name: string) => void;
  onOpenFile: (path: string, name: string) => void;
  onToggle: (path: string) => Promise<void>;
}) {
  const isFolder = node.type === "dir";
  const isLoading = loadingPaths.has(node.path);

  const handleDoubleClick = () => {
    if (isFolder) {
      onOpenFolder(node.path, node.name);
    }
  };

  const handleClick = async () => {
    if (isFolder) {
      await onToggle(node.path);
    } else {
      onOpenFile(node.path, node.name);
    }
  };

  return (
    <div>
      <div
        className={cn([
          "flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm",
          "hover:bg-neutral-100 transition-colors",
        ])}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      >
        {isLoading ? (
          <Spinner size={14} className="shrink-0" />
        ) : isFolder ? (
          node.expanded ? (
            <FolderOpenIcon className="size-4 text-neutral-400 shrink-0" />
          ) : (
            <FolderIcon className="size-4 text-neutral-400 shrink-0" />
          )
        ) : (
          <FileIcon className="size-4 text-neutral-400 shrink-0" />
        )}
        <span className="truncate text-neutral-700">{node.name}</span>
      </div>
      {node.expanded && node.children.length > 0 && (
        <div className="ml-5.5 border-l border-neutral-200">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              loadingPaths={loadingPaths}
              onOpenFolder={onOpenFolder}
              onOpenFile={onOpenFile}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentPanel({
  tabs,
  currentTab,
  onSelectTab,
  onCloseTab,
  onPinTab,
  onReorderTabs,
  selectedItems,
  onDelete,
  onDownloadSelected,
  onClearSelection,
  deletePending,
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  isLoading,
  error,
  items,
  onToggleSelection,
  onCopyToClipboard,
  onDownload,
  onReplace,
  onDeleteSingle,
  onOpenPreview,
}: {
  tabs: Tab[];
  currentTab: Tab | undefined;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onPinTab: (tabId: string) => void;
  onReorderTabs: (tabs: Tab[]) => void;
  selectedItems: Set<string>;
  onDelete: () => void;
  onDownloadSelected: () => void;
  onClearSelection: () => void;
  deletePending: boolean;
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isLoading: boolean;
  error: Error | null;
  items: MediaItem[];
  onToggleSelection: (path: string) => void;
  onCopyToClipboard: (text: string) => void;
  onDownload: (publicUrl: string, filename: string) => void;
  onReplace: (file: File, path: string) => void;
  onDeleteSingle: (path: string) => void;
  onOpenPreview: (path: string, name: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {currentTab ? (
        <>
          <div className="flex items-end">
            <TabBar
              tabs={tabs}
              onSelectTab={onSelectTab}
              onCloseTab={onCloseTab}
              onPinTab={onPinTab}
              onReorderTabs={onReorderTabs}
            />
            <div className="flex-1 border-b border-neutral-200" />
          </div>

          <HeaderBar
            currentTab={currentTab}
            selectedItems={selectedItems}
            onDelete={onDelete}
            onDownloadSelected={onDownloadSelected}
            onClearSelection={onClearSelection}
            deletePending={deletePending}
            currentFile={
              currentTab.type === "file"
                ? items.find((i) => i.path === currentTab.path)
                : undefined
            }
            onCopyToClipboard={onCopyToClipboard}
            onDownload={onDownload}
            onReplace={onReplace}
            onDeleteSingle={onDeleteSingle}
          />

          <div className="flex-1 min-h-0 overflow-hidden">
            {currentTab.type === "folder" ? (
              <FolderView
                dragOver={dragOver}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                isLoading={isLoading}
                error={error}
                items={items}
                selectedItems={selectedItems}
                onToggleSelection={onToggleSelection}
                onCopyToClipboard={onCopyToClipboard}
                onDownload={onDownload}
                onReplace={onReplace}
                onDeleteSingle={onDeleteSingle}
                onOpenPreview={onOpenPreview}
              />
            ) : (
              <FilePreview
                item={items.find((i) => i.path === currentTab.path)}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          <div className="text-center">
            <FolderOpenIcon className="size-12 mb-3" />
            <p className="text-sm">
              Double-click a folder or file in the sidebar to open
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBar({
  tabs,
  onSelectTab,
  onCloseTab,
  onPinTab,
  onReorderTabs,
}: {
  tabs: Tab[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
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
  onPin,
}: {
  tab: Tab;
  onSelect: () => void;
  onClose: () => void;
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

  const isHome = tab.isHome === true;

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1 && !isHome) {
      e.preventDefault();
      onClose();
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
        onAuxClick={handleAuxClick}
      >
        {isHome ? (
          <HomeIcon className="size-4 text-neutral-400" />
        ) : tab.type === "folder" ? (
          <FolderIcon className="size-4 text-neutral-400" />
        ) : (
          <FileIcon className="size-4 text-neutral-400" />
        )}
        <span className={cn(["truncate max-w-30", !tab.pinned && "italic"])}>
          {tab.name}
        </span>
        {!isHome && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-0.5 hover:bg-neutral-200 rounded transition-colors"
          >
            <XIcon className="size-3 text-neutral-500" />
          </button>
        )}
      </div>

      {!isHome && contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCloseTab={onClose}
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
  onPinTab,
  isPinned,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onCloseTab: () => void;
  onPinTab: () => void;
  isPinned: boolean;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className={cn([
          "fixed z-50 min-w-35 py-1",
          "bg-white border border-neutral-200 rounded-xs shadow-lg",
        ])}
        style={{ left: x, top: y }}
      >
        <button
          onClick={() => {
            onCloseTab();
            onClose();
          }}
          className="w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors"
        >
          <XIcon className="size-4" />
          Close
        </button>
        <div className="my-1 border-t border-neutral-200" />
        <button
          onClick={() => {
            onPinTab();
            onClose();
          }}
          className="w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors"
        >
          {isPinned ? (
            <>
              <PinOffIcon className="size-4" />
              Unpin tab
            </>
          ) : (
            <>
              <PinIcon className="size-4" />
              Pin tab
            </>
          )}
        </button>
      </div>
    </>
  );
}

function HeaderBar({
  currentTab,
  selectedItems,
  onDelete,
  onDownloadSelected,
  onClearSelection,
  deletePending,
  currentFile,
  onCopyToClipboard,
  onDownload,
  onReplace,
  onDeleteSingle,
}: {
  currentTab: Tab;
  selectedItems: Set<string>;
  onDelete: () => void;
  onDownloadSelected: () => void;
  onClearSelection: () => void;
  deletePending: boolean;
  currentFile?: MediaItem;
  onCopyToClipboard: (text: string) => void;
  onDownload: (publicUrl: string, filename: string) => void;
  onReplace: (file: File, path: string) => void;
  onDeleteSingle: (path: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const breadcrumbs = currentTab.path ? currentTab.path.split("/") : [];

  return (
    <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-200">
      <div className="flex items-center gap-1 text-sm text-neutral-500">
        {breadcrumbs.length === 0 ? (
          <span className="text-neutral-700 font-medium">Home</span>
        ) : (
          breadcrumbs.map((crumb, index) => (
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
          ))
        )}
        {currentFile && (
          <span className="text-xs text-neutral-400 ml-2">
            {formatFileSize(currentFile.size)} • {currentFile.mimeType}
          </span>
        )}
      </div>

      {currentTab.type === "folder" && selectedItems.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">
            {selectedItems.size} selected
          </span>
          <button
            onClick={onDownloadSelected}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-neutral-600"
            title="Download selected"
          >
            <DownloadIcon className="size-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={deletePending}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-red-600 disabled:opacity-50"
            title="Delete selected"
          >
            <Trash2Icon className="size-4" />
          </button>
          <button
            onClick={onClearSelection}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-neutral-600"
            title="Clear selection"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {currentTab.type === "file" && currentFile && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopyToClipboard(currentFile.publicUrl)}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-neutral-600"
            title="Copy URL"
          >
            <CopyIcon className="size-4" />
          </button>
          <button
            onClick={() => onDownload(currentFile.publicUrl, currentFile.name)}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-neutral-600"
            title="Download"
          >
            <DownloadIcon className="size-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-neutral-600"
            title="Replace"
          >
            <RefreshCwIcon className="size-4" />
          </button>
          <button
            onClick={() => onDeleteSingle(currentFile.path)}
            className="p-1.5 rounded transition-colors text-neutral-400 hover:text-red-600"
            title="Delete"
          >
            <Trash2Icon className="size-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onReplace(file, currentFile.path);
                e.target.value = "";
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

function FolderView({
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  isLoading,
  error,
  items,
  selectedItems,
  onToggleSelection,
  onCopyToClipboard,
  onDownload,
  onReplace,
  onDeleteSingle,
  onOpenPreview,
}: {
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isLoading: boolean;
  error: Error | null;
  items: MediaItem[];
  selectedItems: Set<string>;
  onToggleSelection: (path: string) => void;
  onCopyToClipboard: (text: string) => void;
  onDownload: (publicUrl: string, filename: string) => void;
  onReplace: (file: File, path: string) => void;
  onDeleteSingle: (path: string) => void;
  onOpenPreview: (path: string, name: string) => void;
}) {
  return (
    <div
      className={cn(["h-full overflow-y-auto p-4", dragOver && "bg-blue-50"])}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full text-neutral-500">
          <Spinner size={24} className="mr-2" />
          Loading...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
          <AlertCircleIcon className="size-12 mb-3 text-red-400" />
          <p className="text-sm text-red-600">Failed to load media</p>
          <p className="text-xs mt-1 text-neutral-400">{error.message}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
          <FolderOpenIcon className="size-12 mb-3" />
          <p className="text-sm">No files found</p>
          <p className="text-xs mt-1">Drag and drop files here or click Add</p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          }}
        >
          {items.map((item) => (
            <MediaItemCard
              key={item.path}
              item={item}
              isSelected={selectedItems.has(item.path)}
              onSelect={() => onToggleSelection(item.path)}
              onCopyPath={() => onCopyToClipboard(item.publicUrl)}
              onDownload={() => onDownload(item.publicUrl, item.name)}
              onReplace={(file) => onReplace(file, item.path)}
              onDelete={() => onDeleteSingle(item.path)}
              onOpenPreview={() => onOpenPreview(item.path, item.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaItemCard({
  item,
  isSelected,
  onSelect,
  onCopyPath,
  onDownload,
  onReplace,
  onDelete,
  onOpenPreview,
}: {
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onCopyPath: () => void;
  onDownload: () => void;
  onReplace: (file: File) => void;
  onDelete: () => void;
  onOpenPreview: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleReplace = () => {
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplace(file);
      e.target.value = "";
    }
  };

  const handleCopyPath = () => {
    onCopyPath();
    setShowMenu(false);
  };

  const handleDownload = () => {
    onDownload();
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete();
    setShowMenu(false);
  };

  if (item.type === "dir") {
    return (
      <div
        className={cn([
          "group relative rounded-lg border overflow-hidden cursor-pointer transition-all",
          isSelected
            ? "border-blue-500 ring-2 ring-blue-500"
            : "border-neutral-200 hover:border-neutral-300 hover:shadow-md",
        ])}
        onClick={onSelect}
      >
        <div className="aspect-square bg-neutral-100 flex items-center justify-center">
          <FolderIcon className="size-12 text-neutral-400" />
        </div>
        <div className="p-2 bg-white">
          <p className="text-sm text-neutral-700 truncate" title={item.name}>
            {item.name}
          </p>
        </div>

        <div
          className={cn([
            "absolute top-2 left-2 z-10 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ])}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <div
            className={cn([
              "w-5 h-5 rounded flex items-center justify-center shadow-xs cursor-pointer",
              isSelected
                ? "bg-blue-500"
                : "bg-white border-2 border-neutral-300",
            ])}
          >
            {isSelected && <CheckIcon className="size-3 text-white" />}
          </div>
        </div>
      </div>
    );
  }

  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");
  const isAudio = item.mimeType?.startsWith("audio/");

  return (
    <div
      className={cn([
        "group relative rounded-lg border overflow-hidden cursor-pointer transition-all",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500"
          : "border-neutral-200 hover:border-neutral-300 hover:shadow-md",
      ])}
      onClick={onOpenPreview}
    >
      <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
        {isImage && item.publicUrl ? (
          <img
            src={item.publicUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isVideo ? (
          <div className="relative w-full h-full bg-neutral-900 flex items-center justify-center">
            <FileIcon className="size-12 text-neutral-400" />
            <span className="absolute bottom-2 right-2 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
              Video
            </span>
          </div>
        ) : isAudio ? (
          <div className="relative w-full h-full bg-neutral-900 flex items-center justify-center">
            <FileIcon className="size-12 text-neutral-400" />
            <span className="absolute bottom-2 right-2 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
              Audio
            </span>
          </div>
        ) : (
          <FileIcon className="size-12 text-neutral-400" />
        )}
      </div>

      <div
        className={cn([
          "absolute top-2 left-2 z-10 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        ])}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div
          className={cn([
            "w-5 h-5 rounded flex items-center justify-center shadow-xs cursor-pointer",
            isSelected ? "bg-blue-500" : "bg-white border-2 border-neutral-300",
          ])}
        >
          {isSelected && <CheckIcon className="size-3 text-white" />}
        </div>
      </div>

      <div
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-6 h-6 rounded bg-white/90 hover:bg-white border border-neutral-200 flex items-center justify-center shadow-xs"
        >
          <MoreVerticalIcon className="size-4 text-neutral-700" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div
              className={cn([
                "absolute top-full right-0 mt-1 z-50 min-w-40 py-1",
                "bg-white border border-neutral-200 rounded-xs shadow-lg",
              ])}
            >
              <button
                onClick={handleCopyPath}
                className="w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors"
              >
                <CopyIcon className="size-4" />
                Copy URL
              </button>
              <button
                onClick={handleDownload}
                className="w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors"
              >
                <DownloadIcon className="size-4" />
                Download
              </button>
              <button
                onClick={handleReplace}
                className="w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors"
              >
                <RefreshCwIcon className="size-4" />
                Replace
              </button>
              <div className="my-1 border-t border-neutral-200" />
              <button
                onClick={handleDelete}
                className="w-full px-3 py-1.5 text-sm text-left flex items-center gap-2 hover:bg-neutral-100 transition-colors text-red-600"
              >
                <Trash2Icon className="size-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-2 bg-white">
        <p className="text-sm text-neutral-700 truncate" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-neutral-400">{formatFileSize(item.size)}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function FilePreview({ item }: { item: MediaItem | undefined }) {
  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <p className="text-sm">File not found</p>
      </div>
    );
  }

  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");
  const isAudio = item.mimeType?.startsWith("audio/");

  return (
    <div className="h-full bg-neutral-50 p-4 flex items-center justify-center">
      {isImage && (
        <img
          src={item.publicUrl}
          alt={item.name}
          className="max-w-full max-h-full object-contain"
        />
      )}
      {isVideo && (
        <video
          src={item.publicUrl}
          controls
          className="max-w-full max-h-full object-contain"
        />
      )}
      {isAudio && (
        <audio src={item.publicUrl} controls className="w-full max-w-md" />
      )}
      {!isImage && !isVideo && !isAudio && (
        <div className="text-center">
          <FileIcon className="size-16 text-neutral-400 mb-4" />
          <p className="text-sm text-neutral-600">{item.name}</p>
          <p className="text-xs text-neutral-400 mt-1">
            {formatFileSize(item.size)}
          </p>
        </div>
      )}
    </div>
  );
}
