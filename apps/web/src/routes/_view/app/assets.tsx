import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronRight,
  Copy,
  File,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Home,
  Link,
  MoreVertical,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/functions/supabase";

export const Route = createFileRoute("/_view/app/assets")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

interface FileObject {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface FolderItem {
  name: string;
  isFolder: true;
}

type ListItem = (FileObject & { isFolder: false }) | FolderItem;

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"].includes(ext || "")) {
    return FileImage;
  }
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext || "")) {
    return FileVideo;
  }
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext || "")) {
    return FileText;
  }
  if (["html", "htm"].includes(ext || "")) {
    return Link;
  }
  return File;
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Component() {
  const { user } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: ListItem;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const userId = user?.id;
  const fullPath = userId
    ? [userId, ...currentPath].filter(Boolean).join("/")
    : "";

  const listQuery = useQuery({
    queryKey: ["assets", fullPath],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.storage
        .from("assets")
        .list(fullPath, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;

      const items: ListItem[] = [];
      const seenFolders = new Set<string>();

      for (const item of data || []) {
        if (item.id === null && !seenFolders.has(item.name)) {
          seenFolders.add(item.name);
          items.push({ name: item.name, isFolder: true });
        } else if (item.id !== null) {
          items.push({ ...item, isFolder: false });
        }
      }

      items.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

      return items;
    },
    enabled: !!userId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const supabase = getSupabaseBrowserClient();
      const results = [];

      for (const file of Array.from(files)) {
        const relativePath =
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
          file.name;
        const filePath = fullPath
          ? `${fullPath}/${relativePath}`
          : relativePath;

        const { data, error } = await supabase.storage
          .from("assets")
          .upload(filePath, file, { upsert: true });

        if (error) throw error;
        results.push(data);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", fullPath] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (paths: string[]) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.storage.from("assets").remove(paths);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", fullPath] });
      setSelectedItems(new Set());
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const supabase = getSupabaseBrowserClient();
      const folderPath = fullPath
        ? `${fullPath}/${folderName}/.keep`
        : `${folderName}/.keep`;
      const { error } = await supabase.storage
        .from("assets")
        .upload(folderPath, new Blob([""]), { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", fullPath] });
      setIsCreatingFolder(false);
      setNewFolderName("");
    },
  });

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadMutation.mutate(e.target.files);
      }
      e.target.value = "";
    },
    [uploadMutation],
  );

  const handleNavigate = useCallback((folderName: string) => {
    setCurrentPath((prev) => [...prev, folderName]);
    setSelectedItems(new Set());
  }, []);

  const handleNavigateToPath = useCallback((index: number) => {
    setCurrentPath((prev) => prev.slice(0, index));
    setSelectedItems(new Set());
  }, []);

  const handleSelect = useCallback(
    (itemName: string, isShiftClick: boolean) => {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (isShiftClick) {
          if (newSet.has(itemName)) {
            newSet.delete(itemName);
          } else {
            newSet.add(itemName);
          }
        } else {
          if (newSet.has(itemName) && newSet.size === 1) {
            newSet.clear();
          } else {
            newSet.clear();
            newSet.add(itemName);
          }
        }
        return newSet;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(() => {
    if (!listQuery.data) return;
    const allNames = listQuery.data
      .filter((item) => !item.isFolder)
      .map((item) => item.name);
    setSelectedItems((prev) => {
      if (prev.size === allNames.length) {
        return new Set();
      }
      return new Set(allNames);
    });
  }, [listQuery.data]);

  const handleDelete = useCallback(() => {
    const paths = Array.from(selectedItems).map((name) =>
      fullPath ? `${fullPath}/${name}` : name,
    );
    if (paths.length > 0) {
      deleteMutation.mutate(paths);
    }
  }, [selectedItems, fullPath, deleteMutation]);

  const handleCopyUrl = useCallback(
    async (itemName: string) => {
      const supabase = getSupabaseBrowserClient();
      const filePath = fullPath ? `${fullPath}/${itemName}` : itemName;
      const { data } = supabase.storage.from("assets").getPublicUrl(filePath);
      await navigator.clipboard.writeText(data.publicUrl);
      setContextMenu(null);
    },
    [fullPath],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: ListItem) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    [],
  );

  const handleCreateFolder = useCallback(() => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  }, [newFolderName, createFolderMutation]);

  return (
    <div
      className="min-h-[calc(100vh-200px)]"
      onClick={() => setContextMenu(null)}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-12 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <h1 className="font-serif text-3xl font-medium text-center">
            Assets Library
          </h1>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <nav className="flex items-center space-x-1 text-sm">
              <button
                onClick={() => handleNavigateToPath(0)}
                className="flex items-center px-2 py-1 rounded hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
              >
                <Home className="w-4 h-4" />
              </button>
              {currentPath.map((folder, index) => (
                <div key={index} className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                  <button
                    onClick={() => handleNavigateToPath(index + 1)}
                    className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                  >
                    {folder}
                  </button>
                </div>
              ))}
            </nav>

            <div className="flex items-center space-x-2">
              {selectedItems.size > 0 && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-full hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete ({selectedItems.size})
                </button>
              )}
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center px-3 py-1.5 text-sm border border-neutral-200 rounded-full hover:bg-neutral-50"
              >
                <FolderPlus className="w-4 h-4 mr-1" />
                New Folder
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-1" />
                {uploadMutation.isPending ? "Uploading..." : "Upload Files"}
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center px-3 py-1.5 text-sm border border-neutral-200 rounded-full hover:bg-neutral-50 disabled:opacity-50"
              >
                <Folder className="w-4 h-4 mr-1" />
                Upload Folder
              </button>
            </div>
          </div>

          {isCreatingFolder && (
            <div className="flex items-center space-x-2 p-3 bg-neutral-50 rounded-lg">
              <Folder className="w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name"
                className="flex-1 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={
                  !newFolderName.trim() || createFolderMutation.isPending
                }
                className="px-3 py-1 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName("");
                }}
                className="px-3 py-1 text-sm border border-neutral-200 rounded hover:bg-neutral-100"
              >
                Cancel
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({
              webkitdirectory: "true",
            } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleFileUpload}
            className="hidden"
          />

          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-neutral-500">Loading...</div>
            </div>
          ) : listQuery.error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-500">
                Error loading files: {(listQuery.error as Error).message}
              </div>
            </div>
          ) : listQuery.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Folder className="w-12 h-12 mb-4 text-neutral-300" />
              <p>No files or folders yet</p>
              <p className="text-sm mt-1">
                Upload files or create a folder to get started
              </p>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedItems.size > 0 &&
                          selectedItems.size ===
                            listQuery.data?.filter((i) => !i.isFolder).length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-neutral-300"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-neutral-600">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-neutral-600 w-32">
                      Size
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-neutral-600 w-40">
                      Modified
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data?.map((item) => {
                    const Icon = item.isFolder
                      ? Folder
                      : getFileIcon(item.name);
                    const isSelected = selectedItems.has(item.name);

                    return (
                      <tr
                        key={item.name}
                        className={`border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={(e) => {
                          if (item.isFolder) {
                            handleNavigate(item.name);
                          } else {
                            handleSelect(item.name, e.shiftKey || e.metaKey);
                          }
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        <td className="px-3 py-2">
                          {!item.isFolder && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(item.name, true);
                              }}
                              className="rounded border-neutral-300"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <Icon
                              className={`w-5 h-5 mr-2 ${
                                item.isFolder
                                  ? "text-yellow-500"
                                  : "text-neutral-400"
                              }`}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-neutral-500">
                          {item.isFolder
                            ? "-"
                            : formatFileSize(
                                (item.metadata as { size?: number })?.size,
                              )}
                        </td>
                        <td className="px-3 py-2 text-sm text-neutral-500">
                          {item.isFolder ? "-" : formatDate(item.updated_at)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, item);
                            }}
                            className="p-1 rounded hover:bg-neutral-200"
                          >
                            <MoreVertical className="w-4 h-4 text-neutral-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.item.isFolder && (
            <button
              onClick={() => handleCopyUrl(contextMenu.item.name)}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-neutral-100"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Public URL
            </button>
          )}
          {contextMenu.item.isFolder && (
            <button
              onClick={() => {
                handleNavigate(contextMenu.item.name);
                setContextMenu(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-neutral-100"
            >
              <Folder className="w-4 h-4 mr-2" />
              Open Folder
            </button>
          )}
          {!contextMenu.item.isFolder && (
            <button
              onClick={() => {
                const path = fullPath
                  ? `${fullPath}/${contextMenu.item.name}`
                  : contextMenu.item.name;
                deleteMutation.mutate([path]);
                setContextMenu(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
