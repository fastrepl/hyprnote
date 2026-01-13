import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent } from "@hypr/ui/components/ui/dialog";
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

function getRelativePath(fullPath: string): string {
  return fullPath.replace(/^apps\/web\/public\/images\/?/, "");
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MediaSelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectionMode = "single",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  selectionMode?: "single" | "multi";
}) {
  const queryClient = useQueryClient();
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [rootExpanded, setRootExpanded] = useState(true);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rootQuery = useQuery({
    queryKey: ["mediaItems", ""],
    queryFn: () => fetchMediaItems(""),
    enabled: open,
  });

  const folderQuery = useQuery({
    queryKey: ["mediaItems", selectedPath],
    queryFn: () => fetchMediaItems(selectedPath),
    enabled: open && selectedPath !== "",
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

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setSelectedFiles(new Set());
    }
  }, [open]);

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

  const handleUpload = (files: FileList) => {
    uploadMutation.mutate(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (publicPath: string) => {
    if (selectionMode === "single") {
      setSelectedFile(selectedFile === publicPath ? null : publicPath);
    } else {
      const newSelection = new Set(selectedFiles);
      if (newSelection.has(publicPath)) {
        newSelection.delete(publicPath);
      } else {
        newSelection.add(publicPath);
      }
      setSelectedFiles(newSelection);
    }
  };

  const handleConfirm = () => {
    if (selectionMode === "single" && selectedFile) {
      onSelect(selectedFile);
      onOpenChange(false);
    } else if (selectionMode === "multi" && selectedFiles.size > 0) {
      onSelect(Array.from(selectedFiles).join(","));
      onOpenChange(false);
    }
  };

  const selectFolder = (path: string) => {
    setSelectedPath(path);
  };

  const currentItems = selectedPath === "" ? rootQuery.data : folderQuery.data;
  const items = (currentItems || [])
    .filter((item) => item.type === "file")
    .map((item) => ({
      ...item,
      relativePath: getRelativePath(item.path),
    }));

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isLoading =
    selectedPath === "" ? rootQuery.isLoading : folderQuery.isLoading;

  const selectionCount =
    selectionMode === "single" ? (selectedFile ? 1 : 0) : selectedFiles.size;

  const breadcrumbs = selectedPath ? selectedPath.split("/") : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!grid-cols-1 max-w-4xl h-[80vh] p-0 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
          <div className="h-10 px-3 flex items-center border-b border-neutral-200">
            <div className="relative w-full flex items-center gap-1.5">
              <Icon
                icon="mdi:magnify"
                className="text-neutral-400 text-sm shrink-0"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full py-1 text-sm bg-transparent focus:outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Root folder */}
            <div
              className={cn([
                "flex items-center gap-1.5 py-1 pl-3 pr-2 cursor-pointer text-sm",
                "hover:bg-neutral-100 transition-colors",
                selectedPath === "" && "bg-neutral-100",
              ])}
              onClick={async () => {
                selectFolder("");
                await toggleNodeExpanded("");
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
            {rootExpanded &&
              treeNodes.map((node) => (
                <SidebarTreeNode
                  key={node.path}
                  node={node}
                  depth={1}
                  selectedPath={selectedPath}
                  loadingPath={loadingPath}
                  onSelect={selectFolder}
                  onToggle={toggleNodeExpanded}
                />
              ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-10 border-b border-neutral-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-1 text-sm text-neutral-600">
              <button
                onClick={() => selectFolder("")}
                className="hover:text-neutral-900"
              >
                images
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-neutral-400">/</span>
                  <button
                    onClick={() =>
                      selectFolder(breadcrumbs.slice(0, i + 1).join("/"))
                    }
                    className="hover:text-neutral-900"
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Body */}
          <div
            className={cn([
              "flex-1 overflow-y-auto p-4",
              dragOver && "bg-blue-50",
            ])}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-neutral-500">
                <Icon
                  icon="mdi:loading"
                  className="animate-spin text-2xl mr-2"
                />
                Loading...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <Icon
                  icon="mdi:folder-open-outline"
                  className="text-4xl mb-3"
                />
                <p className="text-sm">No files found</p>
                <p className="text-xs mt-1">
                  Drag and drop files here or click Upload
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {filteredItems.map((item) => {
                  const isSelected =
                    selectionMode === "single"
                      ? selectedFile === item.publicPath
                      : selectedFiles.has(item.publicPath);
                  return (
                    <div
                      key={item.path}
                      className={cn([
                        "group relative rounded border overflow-hidden cursor-pointer transition-all",
                        isSelected
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-neutral-200 hover:border-neutral-300",
                      ])}
                      onClick={() => handleFileSelect(item.publicPath)}
                    >
                      <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
                        {item.downloadUrl ? (
                          <img
                            src={item.downloadUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Icon
                            icon="mdi:file-outline"
                            className="text-3xl text-neutral-400"
                          />
                        )}
                      </div>
                      <div className="p-1.5">
                        <p
                          className="text-xs text-neutral-700 truncate"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatFileSize(item.size)}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 left-1">
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Icon
                              icon="mdi:check"
                              className="text-white text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="h-14 border-t border-neutral-200 flex items-center justify-between px-4">
            {selectionCount > 0 ? (
              <>
                <span className="text-sm text-neutral-600">
                  {selectionCount} selected
                </span>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Confirm
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </button>
                <button
                  disabled
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded opacity-50 cursor-not-allowed"
                >
                  Confirm
                </button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarTreeNode({
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

  if (!isFolder) return null;

  return (
    <div>
      <div
        className={cn([
          "flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm",
          "hover:bg-neutral-100 transition-colors",
          isSelected && "bg-neutral-100",
        ])}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={async () => {
          onSelect(node.path);
          await onToggle(node.path);
        }}
      >
        {isLoading ? (
          <Icon
            icon="mdi:loading"
            className="text-neutral-400 text-sm animate-spin"
          />
        ) : (
          <Icon
            icon={node.expanded ? "mdi:folder-open" : "mdi:folder"}
            className="text-neutral-400 text-sm"
          />
        )}
        <span className="truncate text-neutral-700">{node.name}</span>
      </div>
      {node.expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <SidebarTreeNode
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
