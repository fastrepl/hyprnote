import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

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

async function createFolder(name: string, parentFolder: string) {
  const response = await fetch("/api/admin/media/create-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentFolder }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create folder");
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

export const Route = createFileRoute("/admin/")({
  component: MediaLibrary,
});

function MediaLibrary() {
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsQuery = useQuery({
    queryKey: ["mediaItems", currentPath],
    queryFn: () => fetchMediaItems(currentPath),
  });

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
          folder: currentPath,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaItems", currentPath] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (params: { name: string; parentFolder: string }) =>
      createFolder(params.name, params.parentFolder),
    onSuccess: () => {
      setNewFolderName("");
      setShowCreateFolder(false);
      queryClient.invalidateQueries({ queryKey: ["mediaItems", currentPath] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteFiles(paths),
    onSuccess: () => {
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["mediaItems", currentPath] });
    },
  });

  const handleUpload = (files: FileList) => {
    uploadMutation.mutate(files);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      parentFolder: currentPath,
    });
  };

  const handleDelete = () => {
    if (selectedItems.size === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)
    )
      return;
    deleteMutation.mutate(Array.from(selectedItems));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
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


const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // Optionally show success feedback
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback or user notification
  }
};


  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];
  const items = itemsQuery.data || [];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigateToFolder("")}
            className={cn([
              "text-neutral-600 hover:text-neutral-900 transition-colors",
              currentPath === "" && "font-medium text-stone-700",
            ])}
          >
            images
          </button>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-2">
              <Icon icon="mdi:chevron-right" className="text-neutral-400" />
              <button
                onClick={() =>
                  navigateToFolder(breadcrumbs.slice(0, index + 1).join("/"))
                }
                className={cn([
                  "text-neutral-600 hover:text-neutral-900 transition-colors",
                  index === breadcrumbs.length - 1 &&
                    "font-medium text-stone-700",
                ])}
              >
                {crumb}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {selectedItems.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className={cn([
                "px-4 py-2 text-sm rounded-full transition-all",
                "bg-red-50 text-red-600 hover:bg-red-100",
                "disabled:opacity-50",
              ])}
            >
              Delete ({selectedItems.size})
            </button>
          )}
          <button
            onClick={() => setShowCreateFolder(true)}
            className={cn([
              "px-4 py-2 text-sm rounded-full transition-all",
              "border border-neutral-200 text-neutral-700",
              "hover:border-neutral-300 hover:bg-neutral-50",
            ])}
          >
            New folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className={cn([
              "px-4 py-2 text-sm rounded-full transition-all",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "disabled:opacity-50",
            ])}
          >
            <span className="flex items-center gap-2">
              <Icon icon="mdi:plus" />
              {uploadMutation.isPending ? "Uploading..." : "Add"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleUpload(e.target.files);
                e.target.value = ''; // Clear the input
              }
            }}
          />
        </div>
      </div>

      {showCreateFolder && (
        <div className="border-b border-neutral-100 px-6 py-4 bg-stone-50/50">
          <div className="flex items-center gap-3 max-w-md">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className={cn([
                "flex-1 px-4 py-2 text-sm",
                "border border-neutral-200 rounded-lg",
                "focus:outline-none focus:border-stone-400",
              ])}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending}
              className={cn([
                "px-4 py-2 text-sm rounded-lg transition-all",
                "bg-stone-600 text-white hover:bg-stone-700",
                "disabled:opacity-50",
              ])}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName("");
              }}
              className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className={cn([
          "flex-1 overflow-y-auto p-6",
          dragOver && "bg-stone-50",
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <Icon icon="mdi:folder-open-outline" className="text-4xl mb-3" />
            <p className="text-sm">No files in this folder</p>
            <p className="text-xs mt-1">
              Drag and drop files here or click Add
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {items.map((item) => (
              <MediaItemCard
                key={item.path}
                item={item}
                isSelected={selectedItems.has(item.path)}
                onSelect={() => toggleSelection(item.path)}
                onNavigate={() =>
                  item.type === "dir" &&
                  navigateToFolder(
                    currentPath ? `${currentPath}/${item.name}` : item.name,
                  )
                }
                onCopyPath={() => copyToClipboard(item.publicPath)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaItemCard({
  item,
  isSelected,
  onSelect,
  onNavigate,
  onCopyPath,
}: {
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onCopyPath: () => void;
}) {
  const isFolder = item.type === "dir";

  return (
    <div
      className={cn([
        "group relative rounded-lg border overflow-hidden cursor-pointer transition-all",
        isSelected
          ? "border-stone-500 bg-stone-50 ring-1 ring-stone-500"
          : "border-neutral-200 hover:border-neutral-300",
      ])}
      onClick={() => (isFolder ? onNavigate() : onSelect())}
    >
      <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
        {isFolder ? (
          <Icon
            icon="mdi:folder"
            className="text-4xl text-stone-400 group-hover:text-stone-500 transition-colors"
          />
        ) : item.downloadUrl ? (
          <img
            src={item.downloadUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon icon="mdi:file-outline" className="text-4xl text-neutral-400" />
        )}
      </div>

      <div className="p-2">
        <p className="text-xs text-neutral-700 truncate" title={item.name}>
          {item.name}
        </p>
        {!isFolder && (
          <p className="text-xs text-neutral-400">
            {formatFileSize(item.size)}
          </p>
        )}
      </div>

      {!isFolder && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyPath();
          }}
          className={cn([
            "absolute top-2 right-2 p-1.5 rounded-md",
            "bg-white/90 backdrop-blur-sm shadow-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-white",
          ])}
          title="Copy path"
        >
          <Icon icon="mdi:content-copy" className="text-neutral-600 text-sm" />
        </button>
      )}

      {isSelected && (
        <div className="absolute top-2 left-2">
          <div className="w-5 h-5 rounded-full bg-stone-600 flex items-center justify-center">
            <Icon icon="mdi:check" className="text-white text-xs" />
          </div>
        </div>
      )}
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
