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

interface FolderTreeItem {
  path: string;
  name: string;
  children: FolderTreeItem[];
  expanded: boolean;
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

async function buildFolderTree(
  path: string,
  depth: number,
): Promise<FolderTreeItem[]> {
  if (depth > 3) return [];
  try {
    const response = await fetch(
      `/api/admin/media/list?path=${encodeURIComponent(path)}`,
    );
    const data = await response.json();
    if (!response.ok) return [];

    const folders = data.items.filter((item: MediaItem) => item.type === "dir");
    const result: FolderTreeItem[] = [];

    for (const folder of folders) {
      const folderPath = path ? `${path}/${folder.name}` : folder.name;
      const children = await buildFolderTree(folderPath, depth + 1);
      result.push({
        path: folderPath,
        name: folder.name,
        children,
        expanded: false,
      });
    }
    return result;
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/admin/media/")({
  component: MediaLibrary,
});

type TabType = "all" | "images" | "videos" | "documents";

function MediaLibrary() {
  const queryClient = useQueryClient();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsQuery = useQuery({
    queryKey: ["mediaItems", currentPath],
    queryFn: () => fetchMediaItems(currentPath),
  });

  const folderTreeQuery = useQuery({
    queryKey: ["folderTree"],
    queryFn: () => buildFolderTree("", 0),
  });

  useEffect(() => {
    if (folderTreeQuery.data) {
      setFolderTree(folderTreeQuery.data);
    }
  }, [folderTreeQuery.data]);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const targetPath = selectedPath ?? currentPath;
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
          folder: targetPath,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaItems", currentPath] });
      queryClient.invalidateQueries({ queryKey: ["folderTree"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteFiles(paths),
    onSuccess: () => {
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["mediaItems", currentPath] });
      queryClient.invalidateQueries({ queryKey: ["folderTree"] });
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

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
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

  const toggleFolderExpanded = (path: string) => {
    const updateTree = (items: FolderTreeItem[]): FolderTreeItem[] => {
      return items.map((item) => {
        if (item.path === path) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children.length > 0) {
          return { ...item, children: updateTree(item.children) };
        }
        return item;
      });
    };
    setFolderTree(updateTree(folderTree));
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

  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
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

  const filterFolderTree = (
    items: FolderTreeItem[],
    query: string,
  ): FolderTreeItem[] => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items
      .map((item) => {
        const matchesName = item.name.toLowerCase().includes(lowerQuery);
        const filteredChildren = filterFolderTree(item.children, query);

        if (matchesName || filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
            expanded: query.length > 0,
          };
        }
        return null;
      })
      .filter((item): item is FolderTreeItem => item !== null);
  };

  const items = itemsQuery.data || [];
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = matchesFileTypeFilter(item);
    return matchesSearch && matchesType;
  });

  const filteredFolderTree = filterFolderTree(folderTree, searchQuery);

  const tabs: { id: TabType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "documents", label: "Documents" },
  ];

  const renderFolderTree = (
    items: FolderTreeItem[],
    depth: number = 0,
  ): React.ReactNode => {
    return items.map((item) => {
      const isSelected = selectedPath === item.path;
      const hasChildren = item.children.length > 0;

      return (
        <div key={item.path}>
          <div
            className={cn([
              "flex items-center gap-1 py-1 pr-2 cursor-pointer text-sm",
              "hover:bg-neutral-100 transition-colors",
              isSelected && "bg-neutral-100",
            ])}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => {
              setSelectedPath(item.path);
              navigateToFolder(item.path);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleFolderExpanded(item.path);
                }
              }}
              className={cn([
                "w-4 h-4 flex items-center justify-center",
                !hasChildren && "invisible",
              ])}
            >
              <Icon
                icon={item.expanded ? "mdi:chevron-down" : "mdi:chevron-right"}
                className="text-neutral-400 text-xs"
              />
            </button>
            <Icon
              icon={item.expanded ? "mdi:folder-open" : "mdi:folder"}
              className="text-neutral-400 text-sm"
            />
            <span className="truncate text-neutral-700">{item.name}</span>
          </div>
          {item.expanded && hasChildren && (
            <div>{renderFolderTree(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-56 flex-shrink-0 border-r border-neutral-100 bg-white flex flex-col">
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
                "border border-neutral-100 rounded",
                "focus:outline-none focus:border-neutral-400",
                "placeholder:text-neutral-400",
              ])}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            className={cn([
              "flex items-center gap-1 py-1 px-2 cursor-pointer text-sm",
              "hover:bg-neutral-100 transition-colors",
              (selectedPath === "" || selectedPath === null) &&
                "bg-neutral-100",
            ])}
            onClick={() => {
              setSelectedPath("");
              navigateToFolder("");
            }}
          >
            <span className="w-4" />
            <Icon icon="mdi:folder" className="text-neutral-400 text-sm" />
            <span className="text-neutral-700">images</span>
          </div>
          {renderFolderTree(filteredFolderTree)}
        </div>

        {selectedPath !== null && (
          <div className="p-2 border-t border-neutral-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className={cn([
                "w-full py-2 text-sm font-medium rounded",
                "bg-neutral-900 text-white",
                "hover:bg-neutral-800 transition-colors",
                "disabled:opacity-50",
              ])}
            >
              {uploadMutation.isPending ? "Uploading..." : "+ Add"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
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
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 px-3">
              <span className="text-sm text-neutral-600">
                {selectedItems.size} selected
              </span>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 rounded"
              >
                Clear
              </button>
            </div>
          )}
        </div>

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
          {itemsQuery.isLoading ? (
            <div className="flex items-center justify-center h-64 text-neutral-500">
              <Icon icon="mdi:loading" className="animate-spin text-2xl mr-2" />
              Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
              <Icon icon="mdi:folder-open-outline" className="text-4xl mb-3" />
              <p className="text-sm">No files found</p>
              <p className="text-xs mt-1">
                Drag and drop files here or select a folder and click Add
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.path}
                  className={cn([
                    "group relative rounded border overflow-hidden cursor-pointer transition-all",
                    selectedItems.has(item.path)
                      ? "border-blue-500 ring-1 ring-blue-500"
                      : "border-neutral-100 hover:border-neutral-300",
                  ])}
                  onClick={() =>
                    item.type === "dir"
                      ? navigateToFolder(
                          currentPath
                            ? `${currentPath}/${item.name}`
                            : item.name,
                        )
                      : toggleSelection(item.path)
                  }
                >
                  <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
                    {item.type === "dir" ? (
                      <Icon
                        icon="mdi:folder"
                        className="text-3xl text-neutral-400"
                      />
                    ) : item.downloadUrl ? (
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
                        copyToClipboard(item.publicPath);
                      }}
                      className={cn([
                        "absolute top-1 right-1 p-1 rounded",
                        "bg-white/90 shadow-sm",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "hover:bg-white",
                      ])}
                      title="Copy path"
                    >
                      <Icon
                        icon="mdi:content-copy"
                        className="text-neutral-600 text-xs"
                      />
                    </button>
                  )}

                  {selectedItems.has(item.path) && (
                    <div className="absolute top-1 left-1">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Icon icon="mdi:check" className="text-white text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
