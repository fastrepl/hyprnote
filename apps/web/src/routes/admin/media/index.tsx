import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface MediaItem {
  name: string;
  path: string;
  publicPath: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  downloadUrl: string | null;
}

interface FolderOption {
  path: string;
  name: string;
  depth: number;
}

export const Route = createFileRoute("/admin/media/")({
  component: MediaLibrary,
});

function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveDestination, setMoveDestination] = useState("");
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
  const [moving, setMoving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: MediaItem;
  } | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameItem, setRenameItem] = useState<MediaItem | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/media/list?path=${encodeURIComponent(path)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch media");
      }
      setItems(data.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath, fetchItems]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
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

        const response = await fetch("/api/admin/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content,
            folder: currentPath,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }
      }
      await fetchItems(currentPath);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)
    )
      return;

    try {
      const response = await fetch("/api/admin/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: Array.from(selectedItems) }),
      });

      const data = await response.json();
      if (data.errors && data.errors.length > 0) {
        setError(`Some files failed to delete: ${data.errors.join(", ")}`);
      }
      setSelectedItems(new Set());
      await fetchItems(currentPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSelectAll = () => {
    const fileItems = items.filter((item) => item.type === "file");
    if (selectedItems.size === fileItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(fileItems.map((item) => item.path)));
    }
  };

  const handleDownload = async () => {
    if (selectedItems.size === 0) return;
    setDownloading(true);

    const errors: string[] = [];
    const selectedFiles = items.filter(
      (item) => selectedItems.has(item.path) && item.downloadUrl,
    );

    for (const file of selectedFiles) {
      if (file.downloadUrl) {
        try {
          const response = await fetch(file.downloadUrl);
          if (!response.ok) {
            errors.push(`${file.name}: ${response.statusText}`);
            continue;
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
        } catch (err) {
          errors.push(`${file.name}: ${(err as Error).message}`);
        }
      }
    }

    if (errors.length > 0) {
      setError(`Some files failed to download: ${errors.join(", ")}`);
    }
    setDownloading(false);
  };

  const fetchFolderOptions = async () => {
    const folders: FolderOption[] = [
      { path: "", name: "images (root)", depth: 0 },
    ];

    const fetchFoldersRecursive = async (
      path: string,
      depth: number,
    ): Promise<void> => {
      try {
        const response = await fetch(
          `/api/admin/media/list?path=${encodeURIComponent(path)}`,
        );
        const data = await response.json();
        if (response.ok) {
          const subfolders = data.items.filter(
            (item: MediaItem) => item.type === "dir",
          );
          for (const folder of subfolders) {
            const folderPath = path ? `${path}/${folder.name}` : folder.name;
            folders.push({
              path: folderPath,
              name: folder.name,
              depth: depth + 1,
            });
            if (depth < 2) {
              await fetchFoldersRecursive(folderPath, depth + 1);
            }
          }
        }
      } catch {
        // Ignore errors when fetching folder structure
      }
    };

    await fetchFoldersRecursive("", 0);
    setFolderOptions(folders);
  };

  const openMoveDialog = async () => {
    if (selectedItems.size === 0) return;
    await fetchFolderOptions();
    setMoveDestination("");
    setShowMoveDialog(true);
  };

  const handleMove = async () => {
    if (selectedItems.size === 0) return;

    // Check if any files would be moved to their current location
    const wouldMoveToSelf = Array.from(selectedItems).some((sourcePath) => {
      const sourceFolder =
        sourcePath.substring(0, sourcePath.lastIndexOf("/")) || "";
      return sourceFolder === moveDestination;
    });

    if (wouldMoveToSelf) {
      setError("Cannot move files to their current location");
      return;
    }

    setMoving(true);

    try {
      const errors: string[] = [];
      for (const sourcePath of selectedItems) {
        const fileName = sourcePath.split("/").pop() || "";
        const toPath = moveDestination
          ? `${moveDestination}/${fileName}`
          : fileName;

        const response = await fetch("/api/admin/media/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromPath: sourcePath, toPath }),
        });

        if (!response.ok) {
          const data = await response.json();
          errors.push(`${fileName}: ${data.error || "Move failed"}`);
        }
      }

      if (errors.length > 0) {
        setError(`Some files failed to move: ${errors.join(", ")}`);
      }

      setSelectedItems(new Set());
      setShowMoveDialog(false);
      await fetchItems(currentPath);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMoving(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch("/api/admin/media/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolder: currentPath,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create folder");
      }

      setNewFolderName("");
      setShowCreateFolder(false);
      await fetchItems(currentPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
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

  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleContextMenu = (e: React.MouseEvent, item: MediaItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextDelete = async (item: MediaItem) => {
    closeContextMenu();
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const response = await fetch("/api/admin/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [item.path] }),
      });

      const data = await response.json();
      if (data.errors && data.errors.length > 0) {
        setError(`Failed to delete: ${data.errors.join(", ")}`);
      }
      await fetchItems(currentPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleContextDownload = async (item: MediaItem) => {
    closeContextMenu();
    if (!item.downloadUrl) return;

    try {
      const response = await fetch(item.downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleContextCopyPath = (item: MediaItem) => {
    closeContextMenu();
    copyToClipboard(item.publicPath);
  };

  const handleContextCopyImage = async (item: MediaItem) => {
    closeContextMenu();
    if (!item.downloadUrl) return;

    try {
      const response = await fetch(item.downloadUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (err) {
      setError("Failed to copy image to clipboard");
    }
  };

  const openRenameDialog = (item: MediaItem) => {
    closeContextMenu();
    setRenameItem(item);
    const nameParts = item.name.split(".");
    const nameWithoutExt =
      nameParts.length > 1 ? nameParts.slice(0, -1).join(".") : item.name;
    setNewName(nameWithoutExt);
    setShowRenameDialog(true);
  };

  const handleRename = async () => {
    if (!renameItem || !newName.trim()) return;
    setRenaming(true);

    try {
      const ext = renameItem.name.includes(".")
        ? "." + renameItem.name.split(".").pop()
        : "";
      const newFileName = newName.trim() + ext;
      const parentPath = renameItem.path.split("/").slice(0, -1).join("/");
      const toPath = parentPath ? `${parentPath}/${newFileName}` : newFileName;

      const response = await fetch("/api/admin/media/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPath: renameItem.path, toPath }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Rename failed");
      }

      setShowRenameDialog(false);
      setRenameItem(null);
      setNewName("");
      await fetchItems(currentPath);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRenaming(false);
    }
  };

  const openContextMoveDialog = async (item: MediaItem) => {
    closeContextMenu();
    setSelectedItems(new Set([item.path]));
    await fetchFolderOptions();
    setMoveDestination("");
    setShowMoveDialog(true);
  };

  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Media Library
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
          >
            New Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      {selectedItems.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-800">
              {selectedItems.size} item(s) selected
            </span>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {selectedItems.size ===
              items.filter((i) => i.type === "file").length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50"
            >
              {downloading ? "Downloading..." : "Download"}
            </button>
            <button
              onClick={openMoveDialog}
              className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
            >
              Move
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <nav className="flex items-center gap-2 mb-4 text-sm">
        <button
          onClick={() => navigateToFolder("")}
          className="text-blue-600 hover:text-blue-800"
        >
          images
        </button>
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center gap-2">
            <span className="text-neutral-400">/</span>
            <button
              onClick={() =>
                navigateToFolder(breadcrumbs.slice(0, index + 1).join("/"))
              }
              className="text-blue-600 hover:text-blue-800"
            >
              {crumb}
            </button>
          </span>
        ))}
      </nav>

      {showCreateFolder && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-neutral-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <button
              onClick={handleCreateFolder}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName("");
              }}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`bg-white rounded-lg border-2 ${
          dragOver
            ? "border-blue-500 border-dashed bg-blue-50"
            : "border-neutral-200"
        } min-h-[400px] transition-colors`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-500">Loading...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
            <p>No files in this folder</p>
            <p className="text-sm mt-2">
              Drag and drop files here or click Upload
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
            {items.map((item) => (
              <div
                key={item.path}
                className={`relative group cursor-pointer rounded-lg border ${
                  selectedItems.has(item.path)
                    ? "border-blue-500 bg-blue-50"
                    : "border-neutral-200 hover:border-neutral-300"
                } p-2`}
                onClick={() =>
                  item.type === "dir"
                    ? navigateToFolder(
                        currentPath ? `${currentPath}/${item.name}` : item.name,
                      )
                    : toggleSelection(item.path)
                }
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                {item.type === "dir" ? (
                  <div className="aspect-square flex items-center justify-center bg-neutral-100 rounded">
                    <svg
                      className="w-12 h-12 text-neutral-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                ) : (
                  <div className="aspect-square bg-neutral-100 rounded overflow-hidden">
                    {item.downloadUrl && (
                      <img
                        src={item.downloadUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                )}
                <div className="mt-2">
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
                    className="absolute top-1 right-1 p-1 bg-white rounded shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy path"
                  >
                    <svg
                      className="w-4 h-4 text-neutral-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Move {selectedItems.size} item(s)
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              Select destination folder:
            </p>
            <select
              value={moveDestination}
              onChange={(e) => setMoveDestination(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              {folderOptions.map((folder) => (
                <option key={folder.path} value={folder.path}>
                  {"  ".repeat(folder.depth)}
                  {folder.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMoveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={moving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {moving ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-neutral-200 py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.type === "file" && (
            <>
              <button
                onClick={() => handleContextDownload(contextMenu.item)}
                className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
              <button
                onClick={() => handleContextCopyPath(contextMenu.item)}
                className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Path
              </button>
              <button
                onClick={() => handleContextCopyImage(contextMenu.item)}
                className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Copy as PNG
              </button>
              <div className="border-t border-neutral-200 my-1" />
            </>
          )}
          <button
            onClick={() => openRenameDialog(contextMenu.item)}
            className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Rename
          </button>
          <button
            onClick={() => openContextMoveDialog(contextMenu.item)}
            className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Move
          </button>
          <div className="border-t border-neutral-200 my-1" />
          <button
            onClick={() => handleContextDelete(contextMenu.item)}
            className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      )}

      {showRenameDialog && renameItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Rename "{renameItem.name}"
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                New name
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  autoFocus
                />
                {renameItem.name.includes(".") && (
                  <span className="text-neutral-500">
                    .{renameItem.name.split(".").pop()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setRenameItem(null);
                  setNewName("");
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !newName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {renaming ? "Renaming..." : "Rename"}
              </button>
            </div>
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
