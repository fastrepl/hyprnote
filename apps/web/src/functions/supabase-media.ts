import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

import { env } from "@/env";

const BUCKET_NAME = "blog";

function getDbClient() {
  return postgres(env.DATABASE_URL, { prepare: false });
}

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

function getSupabaseClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  return createClient(env.SUPABASE_URL, key);
}

function getPublicUrl(path: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

export async function listMediaFiles(
  path: string = "",
): Promise<{ items: MediaItem[]; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      return { items: [], error: error.message };
    }

    if (!data) {
      return { items: [] };
    }

    const items: MediaItem[] = data
      .filter(
        (item) =>
          item.name !== ".emptyFolderPlaceholder" && item.name !== ".folder",
      )
      .map((item) => {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        const isFolder = item.id === null;

        return {
          name: item.name,
          path: fullPath,
          publicUrl: isFolder ? "" : getPublicUrl(fullPath),
          id: item.id || "",
          size: item.metadata?.size || 0,
          type: isFolder ? "dir" : "file",
          mimeType: item.metadata?.mimetype || null,
          createdAt: item.created_at || null,
          updatedAt: item.updated_at || null,
        };
      });

    const folders = items.filter((item) => item.type === "dir");
    const files = items.filter((item) => item.type === "file");
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return { items: [...folders, ...files] };
  } catch (error) {
    return {
      items: [],
      error: `Failed to list files: ${(error as Error).message}`,
    };
  }
}

export async function uploadMediaFile(
  supabase: SupabaseClient,
  filename: string,
  content: string,
  folder: string = "",
): Promise<{
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}> {
  const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "svg",
    "webp",
    "avif",
    "mp4",
    "webm",
    "mov",
  ];

  const parts = filename.split(".");
  const ext = parts.pop()?.toLowerCase();
  const baseName = parts.join(".").replace(/[^a-zA-Z0-9.-]/g, "-");

  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      success: false,
      error: "Invalid file type. Only images and videos are allowed.",
    };
  }

  let finalFilename = `${baseName}.${ext}`;
  let path = folder ? `${folder}/${finalFilename}` : finalFilename;

  const { data: existingFiles } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folder || undefined, { limit: 1000 });

  if (existingFiles) {
    const existingNames = new Set(existingFiles.map((f) => f.name));
    let counter = 1;

    while (existingNames.has(finalFilename)) {
      finalFilename = `${baseName}-${counter}.${ext}`;
      counter++;
    }

    path = folder ? `${folder}/${finalFilename}` : finalFilename;
  }

  try {
    const fileBuffer = Buffer.from(content, "base64");

    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      avif: "image/avif",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
    };

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, fileBuffer, {
        contentType: mimeTypes[ext] || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return {
      success: true,
      path,
      publicUrl: data.publicUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: `Upload failed: ${(error as Error).message}`,
    };
  }
}

export async function deleteMediaFiles(
  supabase: SupabaseClient,
  paths: string[],
): Promise<{ success: boolean; deleted: string[]; errors: string[] }> {
  const deleted: string[] = [];
  const errors: string[] = [];
  const sql = getDbClient();

  try {
    for (const path of paths) {
      const isFolder =
        (
          await sql`
        SELECT COUNT(*) as count FROM storage.objects
        WHERE bucket_id = ${BUCKET_NAME}
        AND name LIKE ${path + "/%"}
      `
        )[0].count > 0;

      if (isFolder) {
        await sql`
          DELETE FROM storage.objects
          WHERE bucket_id = ${BUCKET_NAME}
          AND (name = ${path} OR name LIKE ${path + "/%"})
        `;
        deleted.push(path);
      } else {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([path]);

        if (error) {
          errors.push(`${path}: ${error.message}`);
        } else if (data && data.length > 0) {
          deleted.push(path);
        } else {
          errors.push(
            `${path}: File was not deleted - check storage permissions or file path`,
          );
        }
      }
    }

    return {
      success: deleted.length > 0 && errors.length === 0,
      deleted,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      deleted,
      errors: [`Delete failed: ${(error as Error).message}`],
    };
  } finally {
    await sql.end();
  }
}

export async function createMediaFolder(
  _supabase: SupabaseClient,
  folderName: string,
  parentFolder: string = "",
): Promise<{ success: boolean; path?: string; error?: string }> {
  const sql = getDbClient();

  const sanitizedFolderName = folderName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();

  const folderPath = parentFolder
    ? `${parentFolder}/${sanitizedFolderName}`
    : sanitizedFolderName;

  try {
    const existing = await sql`
      SELECT id FROM storage.objects
      WHERE bucket_id = ${BUCKET_NAME}
      AND name LIKE ${folderPath + "/%"}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return { success: false, error: "Folder already exists" };
    }

    await sql`
      INSERT INTO storage.objects (bucket_id, name, owner, metadata)
      VALUES (${BUCKET_NAME}, ${folderPath + "/.folder"}, NULL, '{"mimetype": "application/x-directory"}')
    `;

    return {
      success: true,
      path: folderPath,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create folder: ${(error as Error).message}`,
    };
  } finally {
    await sql.end();
  }
}

export async function moveMediaFile(
  supabase: SupabaseClient,
  fromPath: string,
  toPath: string,
): Promise<{ success: boolean; newPath?: string; error?: string }> {
  const sql = getDbClient();

  try {
    const filesInFolder = await sql`
      SELECT name FROM storage.objects
      WHERE bucket_id = ${BUCKET_NAME}
      AND name LIKE ${fromPath + "/%"}
    `;

    const isFolder = filesInFolder.length > 0;

    if (isFolder) {
      await sql`
        UPDATE storage.objects
        SET name = ${toPath} || SUBSTRING(name FROM ${fromPath.length + 1})
        WHERE bucket_id = ${BUCKET_NAME}
        AND name LIKE ${fromPath + "/%"}
      `;

      return {
        success: true,
        newPath: toPath,
      };
    } else {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .move(fromPath, toPath);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        newPath: toPath,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Move failed: ${(error as Error).message}`,
    };
  } finally {
    await sql.end();
  }
}
