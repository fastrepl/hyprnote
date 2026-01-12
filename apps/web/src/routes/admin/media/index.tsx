import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

interface MediaItem {
  name: string;
  path: string;
  publicPath: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  downloadUrl: string | null;
}

interface TreeNode {
  path: string;
  name: string;
  type: "file" | "dir";
  expanded: boolean;
  loaded: boolean;
  children: TreeNode[];
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

type TabType = "all" | "images" | "videos" | "documents";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

function getRelativePath(fullPath: string): string {
  return fullPath.replace(/^apps\/web\/public\/images\/?/, "");
}

function MediaLibrary() {
  const queryClient = useQueryClient();
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [rootExpanded, setRootExpanded] = useState(true);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

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
    }
  }, [rootQuery.data, rootLoaded]);

  const selectedFolderQuery = useQuery({
    queryKey: ["mediaItems", selectedPath],
    queryFn: () => fetchMediaItems(selectedPath),
    enabled: isMounted && selectedPath !== "",
  });

  const loadFolderContents = async (path: string) => {
    setLoadingPath(path);
    try {
      const items = await fetchMediaItems(path);
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
      setLoadingPath(null);
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
    if (path === "") {
      const willExpand = !rootExpanded;
      if (willExpand && !rootLoaded) {
        await loadFolderContents("");
      }
      setRootExpanded(willExpand);
      return;
    }

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

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
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
          folder: selectedPath,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
      loadFolderContents(selectedPath);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteFiles(paths),
    onSuccess: () => {
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
      loadFolderContents(selectedPath);
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

  const selectFolder = (path: string) => {
    setSelectedPath(path);
    setSelectedItems(new Set());
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

  const matchesFileTypeFilter = (item: MediaItem): boolean => {
    if (item.type === "dir") return true;
    if (activeTab === "all") return true;

    const ext = getFileExtension(item.name);
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"];
    const videoExts = ["mp4", "webm", "mov", "avi", "mkv"];
    const docExts = ["pdf", "doc", "docx", "txt", "md", "mdx"];

    switch (activeTab) {
      case "images":
        return imageExts.includes(ext);
      case "videos":
        return videoExts.includes(ext);
      case "documents":
        return docExts.includes(ext);
      default:
        return true;
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

  const currentItems =
    selectedPath === "" ? rootQuery.data : selectedFolderQuery.data;
  const items = (currentItems || []).map((item) => ({
    ...item,
    relativePath: getRelativePath(item.path),
  }));
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = matchesFileTypeFilter(item);
    return matchesSearch && matchesType;
  });

  const filteredTreeNodes = filterTreeNodes(treeNodes, searchQuery);

  const tabs: { id: TabType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "documents", label: "Documents" },
  ];

  const isLoading =
    selectedPath === "" ? rootQuery.isLoading : selectedFolderQuery.isLoading;
  const error =
    selectedPath === "" ? rootQuery.error : selectedFolderQuery.error;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPath={selectedPath}
        rootExpanded={rootExpanded}
        loadingPath={loadingPath}
        filteredTreeNodes={filteredTreeNodes}
        onSelectFolder={selectFolder}
        onToggleNodeExpanded={toggleNodeExpanded}
        uploadPending={uploadMutation.isPending}
        fileInputRef={fileInputRef}
        onUpload={handleUpload}
      />
      <ContentPanel
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedItems={selectedItems}
        onDelete={handleDelete}
        onClearSelection={() => setSelectedItems(new Set())}
        deletePending={deleteMutation.isPending}
        dragOver={dragOver}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        isLoading={isLoading}
        error={error}
        filteredItems={filteredItems}
        onSelectFolder={selectFolder}
        onToggleSelection={toggleSelection}
        onCopyToClipboard={copyToClipboard}
      />
    </div>
  );
}

function Sidebar({
  searchQuery,
  onSearchChange,
  selectedPath,
  rootExpanded,
  loadingPath,
  filteredTreeNodes,
  onSelectFolder,
  onToggleNodeExpanded,
  uploadPending,
  fileInputRef,
  onUpload,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPath: string;
  rootExpanded: boolean;
  loadingPath: string | null;
  filteredTreeNodes: TreeNode[];
  onSelectFolder: (path: string) => void;
  onToggleNodeExpanded: (path: string) => Promise<void>;
  uploadPending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (files: FileList) => void;
}) {
  return (
    <div className="w-56 shrink-0 border-r border-neutral-100 bg-white flex flex-col">
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
        <RootFolderItem
          selectedPath={selectedPath}
          rootExpanded={rootExpanded}
          loadingPath={loadingPath}
          onSelect={onSelectFolder}
          onToggle={onToggleNodeExpanded}
        />
        {rootExpanded &&
          filteredTreeNodes.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={1}
              selectedPath={selectedPath}
              loadingPath={loadingPath}
              onSelect={onSelectFolder}
              onToggle={onToggleNodeExpanded}
            />
          ))}
      </div>

      <div className="p-2 border-t border-neutral-100">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPending}
          className={cn([
            "w-full py-2 text-sm font-medium rounded",
            "bg-neutral-900 text-white",
            "hover:bg-neutral-800 transition-colors",
            "disabled:opacity-50",
          ])}
        >
          {uploadPending ? "Uploading..." : "+ Add"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
      </div>
    </div>
  );
}

function RootFolderItem({
  selectedPath,
  rootExpanded,
  loadingPath,
  onSelect,
  onToggle,
}: {
  selectedPath: string;
  rootExpanded: boolean;
  loadingPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => Promise<void>;
}) {
  return (
    <div
      className={cn([
        "flex items-center gap-1.5 py-1 pl-4 pr-2 cursor-pointer text-sm",
        "hover:bg-neutral-100 transition-colors",
        selectedPath === "" && "bg-neutral-100",
      ])}
      onClick={async () => {
        onSelect("");
        await onToggle("");
      }}
    >
      {loadingPath === "" ? (
        <Icon
          icon="mdi:loading"
          className="text-neutral-400 text-sm animate-spin"
        />
      ) : (
        <Icon
          icon={rootExpanded ? "mdi:folder-open" : "mdi:folder"}
          className="text-neutral-400 text-sm"
        />
      )}
      <span className="text-neutral-700">images</span>
    </div>
  );
}

function TreeNodeItem({
  node,
  depth,
  selectedPath,
  loadingPath,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string;
  loadingPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => Promise<void>;
}) {
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === "dir";
  const isLoading = loadingPath === node.path;

  return (
    <div>
      <div
        className={cn([
          "flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm",
          "hover:bg-neutral-100 transition-colors",
          isSelected && "bg-neutral-100",
        ])}
        style={{ paddingLeft: `${depth * 16 + 16}px` }}
        onClick={async () => {
          if (isFolder) {
            onSelect(node.path);
            await onToggle(node.path);
          }
        }}
      >
        {isLoading ? (
          <Icon
            icon="mdi:loading"
            className="text-neutral-400 text-sm animate-spin"
          />
        ) : (
          <Icon
            icon={
              isFolder
                ? node.expanded
                  ? "mdi:folder-open"
                  : "mdi:folder"
                : "mdi:file-outline"
            }
            className="text-neutral-400 text-sm"
          />
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
              selectedPath={selectedPath}
              loadingPath={loadingPath}
              onSelect={onSelect}
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
  activeTab,
  onTabChange,
  selectedItems,
  onDelete,
  onClearSelection,
  deletePending,
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  isLoading,
  error,
  filteredItems,
  onSelectFolder,
  onToggleSelection,
  onCopyToClipboard,
}: {
  tabs: { id: TabType; label: string }[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedItems: Set<string>;
  onDelete: () => void;
  onClearSelection: () => void;
  deletePending: boolean;
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isLoading: boolean;
  error: Error | null;
  filteredItems: (MediaItem & { relativePath: string })[];
  onSelectFolder: (path: string) => void;
  onToggleSelection: (path: string) => void;
  onCopyToClipboard: (text: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        selectedItems={selectedItems}
        onDelete={onDelete}
        onClearSelection={onClearSelection}
        deletePending={deletePending}
      />
      <MediaGrid
        dragOver={dragOver}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        isLoading={isLoading}
        error={error}
        filteredItems={filteredItems}
        selectedItems={selectedItems}
        onSelectFolder={onSelectFolder}
        onToggleSelection={onToggleSelection}
        onCopyToClipboard={onCopyToClipboard}
      />
    </div>
  );
}

function TabBar({
  tabs,
  activeTab,
  onTabChange,
  selectedItems,
  onDelete,
  onClearSelection,
  deletePending,
}: {
  tabs: { id: TabType; label: string }[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedItems: Set<string>;
  onDelete: () => void;
  onClearSelection: () => void;
  deletePending: boolean;
}) {
  return (
    <div className="h-10 flex items-stretch border-b border-neutral-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
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
      {selectedItems.size > 0 && (
        <SelectionActions
          count={selectedItems.size}
          onDelete={onDelete}
          onClear={onClearSelection}
          deletePending={deletePending}
        />
      )}
    </div>
  );
}

function SelectionActions({
  count,
  onDelete,
  onClear,
  deletePending,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deletePending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3">
      <span className="text-sm text-neutral-600">{count} selected</span>
      <button
        onClick={onDelete}
        disabled={deletePending}
        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
      >
        Delete
      </button>
      <button
        onClick={onClear}
        className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 rounded"
      >
        Clear
      </button>
    </div>
  );
}

function MediaGrid({
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  isLoading,
  error,
  filteredItems,
  selectedItems,
  onSelectFolder,
  onToggleSelection,
  onCopyToClipboard,
}: {
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isLoading: boolean;
  error: Error | null;
  filteredItems: (MediaItem & { relativePath: string })[];
  selectedItems: Set<string>;
  onSelectFolder: (path: string) => void;
  onToggleSelection: (path: string) => void;
  onCopyToClipboard: (text: string) => void;
}) {
  return (
    <div
      className={cn(["flex-1 overflow-y-auto p-4", dragOver && "bg-blue-50"])}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : filteredItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredItems.map((item) => (
            <MediaItemCard
              key={item.path}
              item={item}
              isSelected={selectedItems.has(item.path)}
              onSelect={() =>
                item.type === "dir"
                  ? onSelectFolder(item.relativePath)
                  : onToggleSelection(item.path)
              }
              onCopyPath={() => onCopyToClipboard(item.publicPath)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 text-neutral-500">
      <Icon icon="mdi:loading" className="animate-spin text-2xl mr-2" />
      Loading...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
      <Icon
        icon="mdi:alert-circle-outline"
        className="text-4xl mb-3 text-red-400"
      />
      <p className="text-sm text-red-600">Failed to load media</p>
      <p className="text-xs mt-1 text-neutral-400">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
      <Icon icon="mdi:folder-open-outline" className="text-4xl mb-3" />
      <p className="text-sm">No files found</p>
      <p className="text-xs mt-1">Drag and drop files here or click Add</p>
    </div>
  );
}

function MediaItemCard({
  item,
  isSelected,
  onSelect,
  onCopyPath,
}: {
  item: MediaItem & { relativePath: string };
  isSelected: boolean;
  onSelect: () => void;
  onCopyPath: () => void;
}) {
  return (
    <div
      className={cn([
        "group relative rounded border overflow-hidden cursor-pointer transition-all",
        isSelected
          ? "border-blue-500 ring-1 ring-blue-500"
          : "border-neutral-100 hover:border-neutral-300",
      ])}
      onClick={onSelect}
    >
      <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
        {item.type === "dir" ? (
          <Icon icon="mdi:folder" className="text-3xl text-neutral-400" />
        ) : item.downloadUrl ? (
          <img
            src={item.downloadUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon icon="mdi:file-outline" className="text-3xl text-neutral-400" />
        )}
      </div>

      <div className="p-1.5">
        <p className="text-xs text-neutral-700 truncate" title={item.name}>
          {item.name}
        </p>
        {item.type === "file" && (
          <p className="text-xs text-neutral-400">
            {formatFileSize(item.size)}
          </p>
        )}
      </div>

      {item.type === "file" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyPath();
          }}
          className={cn([
            "absolute top-1 right-1 p-1 rounded",
            "bg-white/90 shadow-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-white",
          ])}
          title="Copy path"
        >
          <Icon icon="mdi:content-copy" className="text-neutral-600 text-xs" />
        </button>
      )}

      {isSelected && (
        <div className="absolute top-1 left-1">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
            <Icon icon="mdi:check" className="text-white text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}
