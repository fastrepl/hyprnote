import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sonnerToast as toast } from "@hypr/ui/components/ui/toast";

export interface MediaItem {
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

export async function fetchMediaItems(path: string): Promise<MediaItem[]> {
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

async function createFolder(params: { name: string; parentFolder: string }) {
  const response = await fetch("/api/admin/media/create-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create folder");
  }
  return response.json();
}

async function moveFile(params: { fromPath: string; toPath: string }) {
  const response = await fetch("/api/admin/media/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to move file");
  }
  return response.json();
}

export function useMediaApi({
  currentFolderPath,
  onFolderCreated,
  onFileMoved,
  onSelectionCleared,
}: {
  currentFolderPath: string;
  onFolderCreated?: (parentFolder: string) => void;
  onFileMoved?: () => void;
  onSelectionCleared?: () => void;
}) {
  const queryClient = useQueryClient();

  const invalidateAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const fileArray = Array.from(files);
      const totalFiles = fileArray.length;
      const toastId = toast.loading(
        `Uploading ${totalFiles} file${totalFiles > 1 ? "s" : ""}...`,
        { description: `0 / ${totalFiles}` },
      );

      try {
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];
          toast.loading(
            `Uploading ${totalFiles} file${totalFiles > 1 ? "s" : ""}...`,
            { id: toastId, description: `${i} / ${totalFiles}` },
          );

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
            folder: currentFolderPath,
          });
        }

        toast.success(
          `Uploaded ${totalFiles} file${totalFiles > 1 ? "s" : ""}`,
          { id: toastId },
        );
      } catch (error) {
        toast.error("Upload failed", {
          id: toastId,
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    onSuccess: () => {
      invalidateAndRefresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) => deleteFiles(paths),
    onSuccess: () => {
      onSelectionCleared?.();
      invalidateAndRefresh();
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
      invalidateAndRefresh();
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (params: { name: string; parentFolder: string }) =>
      createFolder(params),
    onSuccess: (_, variables) => {
      invalidateAndRefresh();
      onFolderCreated?.(variables.parentFolder);
    },
  });

  const moveMutation = useMutation({
    mutationFn: (params: { fromPath: string; toPath: string }) =>
      moveFile(params),
    onSuccess: () => {
      invalidateAndRefresh();
      onFileMoved?.();
    },
  });

  return {
    uploadMutation,
    deleteMutation,
    replaceMutation,
    createFolderMutation,
    moveMutation,
  };
}
