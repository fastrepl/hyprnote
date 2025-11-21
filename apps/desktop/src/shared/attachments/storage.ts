import { convertFileSrc } from "@tauri-apps/api/core";
import { dataDir, join } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  exists,
  mkdir,
  readFile,
  readTextFile,
  remove as removeFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { Mutex } from "async-mutex";

export type ManifestEntry = {
  id: string;
  fileName: string;
  mimeType: string;
  addedAt: string;
  size: number;
  title?: string;
};

type Manifest = Record<string, ManifestEntry>;

export class ManifestCorruptionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ManifestCorruptionError";
  }
}

type MutexEntry = {
  mutex: Mutex;
  refCount: number;
  lastUsed: number;
};

const manifestLocks = new Map<string, MutexEntry>();
const MUTEX_CLEANUP_INTERVAL = 60_000;
const MUTEX_IDLE_THRESHOLD = 300_000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startMutexCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const toDelete: string[] = [];
    for (const [id, entry] of manifestLocks.entries()) {
      if (entry.refCount === 0 && now - entry.lastUsed > MUTEX_IDLE_THRESHOLD) {
        toDelete.push(id);
      }
    }
    toDelete.forEach((id) => manifestLocks.delete(id));
  }, MUTEX_CLEANUP_INTERVAL);
}

function getManifestMutex(id: string): Mutex {
  startMutexCleanup();
  let entry = manifestLocks.get(id);
  if (!entry) {
    entry = {
      mutex: new Mutex(),
      refCount: 0,
      lastUsed: Date.now(),
    };
    manifestLocks.set(id, entry);
  }
  return entry.mutex;
}

function acquireMutex(id: string) {
  const entry = manifestLocks.get(id);
  if (entry) {
    entry.refCount++;
    entry.lastUsed = Date.now();
  }
}

function releaseMutex(id: string) {
  const entry = manifestLocks.get(id);
  if (entry) {
    entry.refCount = Math.max(0, entry.refCount - 1);
    entry.lastUsed = Date.now();
  }
}

export interface StorageConfig {
  getBasePath: (id: string) => string;
  entityName: string;
  maxSize: number;
  includeTitle?: boolean;
}

export function createAttachmentStorage<T extends ManifestEntry>(
  config: StorageConfig,
) {
  const BASE_DIR = config.getBasePath;
  const ATTACHMENTS_DIR = (id: string) => `${BASE_DIR(id)}/attachments`;
  const ATTACHMENTS_MANIFEST_PATH = (id: string) =>
    `${ATTACHMENTS_DIR(id)}/attachments.json`;
  const ATTACHMENT_ENTRY_DIR = (id: string, attachmentId: string) =>
    `${ATTACHMENTS_DIR(id)}/${attachmentId}`;
  const ATTACHMENT_FILE_PATH = (
    id: string,
    attachmentId: string,
    fileName: string,
  ) => `${ATTACHMENT_ENTRY_DIR(id, attachmentId)}/${fileName}`;

  const DEFAULT_MANIFEST: Manifest = {};

  async function ensureDirectory(path: string) {
    const dirExists = await exists(path, { baseDir: BaseDirectory.Data });
    if (!dirExists) {
      await mkdir(path, {
        baseDir: BaseDirectory.Data,
        recursive: true,
      });
    }
  }

  async function toAbsolutePath(relativePath: string) {
    const resolvedDataDir = await dataDir();
    return await join(resolvedDataDir, relativePath);
  }

  async function readManifest(id: string): Promise<Manifest> {
    const manifestPath = ATTACHMENTS_MANIFEST_PATH(id);
    const manifestExists = await exists(manifestPath, {
      baseDir: BaseDirectory.Data,
    });

    if (!manifestExists) {
      return { ...DEFAULT_MANIFEST };
    }

    try {
      const content = await readTextFile(manifestPath, {
        baseDir: BaseDirectory.Data,
      });
      const parsed = JSON.parse(content) as Manifest;

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new ManifestCorruptionError(
          `Invalid manifest structure: expected object, got ${typeof parsed}`,
        );
      }

      for (const [key, value] of Object.entries(parsed)) {
        const requiredFields =
          !value ||
          typeof value !== "object" ||
          typeof value.id !== "string" ||
          typeof value.fileName !== "string" ||
          typeof value.mimeType !== "string" ||
          typeof value.addedAt !== "string" ||
          typeof value.size !== "number";

        const titleCheck =
          config.includeTitle && typeof value.title !== "string";

        if (requiredFields || titleCheck) {
          throw new ManifestCorruptionError(
            `Invalid manifest entry for key ${key}: missing or invalid required fields`,
          );
        }
      }

      return parsed;
    } catch (error) {
      if (error instanceof ManifestCorruptionError) {
        throw error;
      }
      throw new ManifestCorruptionError(
        `Failed to read or parse manifest for ${config.entityName} ${id}`,
        error,
      );
    }
  }

  async function writeManifest(id: string, manifest: Manifest) {
    const manifestPath = ATTACHMENTS_MANIFEST_PATH(id);
    await ensureDirectory(ATTACHMENTS_DIR(id));
    await writeTextFile(manifestPath, JSON.stringify(manifest), {
      baseDir: BaseDirectory.Data,
    });
  }

  function sanitizeFileName(name: string) {
    const sanitized = name
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .slice(0, 255);
    return sanitized.length > 0 ? sanitized : "attachment";
  }

  async function load(
    id: string,
  ): Promise<Array<T & { filePath: string; fileUrl: string }>> {
    const mutex = getManifestMutex(id);
    return await mutex.runExclusive(async () => {
      acquireMutex(id);
      try {
        await ensureDirectory(ATTACHMENTS_DIR(id));
        const manifest = await readManifest(id);
        const entries = Object.values(manifest);

        const results: Array<T & { filePath: string; fileUrl: string }> = [];

        for (const entry of entries) {
          const relativePath = ATTACHMENT_FILE_PATH(
            id,
            entry.id,
            entry.fileName,
          );
          const existsOnDisk = await exists(relativePath, {
            baseDir: BaseDirectory.Data,
          });
          if (!existsOnDisk) {
            continue;
          }

          const absolutePath = await toAbsolutePath(relativePath);
          results.push({
            ...(entry as T),
            filePath: absolutePath,
            fileUrl: convertFileSrc(absolutePath),
          });
        }

        return results.sort((a, b) =>
          a.addedAt > b.addedAt ? -1 : a.addedAt < b.addedAt ? 1 : 0,
        );
      } finally {
        releaseMutex(id);
      }
    });
  }

  async function save(
    id: string,
    file: File,
    metadata: Partial<T>,
    attachmentId = crypto.randomUUID(),
  ): Promise<T & { filePath: string; fileUrl: string }> {
    if (file.size > config.maxSize) {
      throw new Error(
        `Attachment size ${file.size} exceeds maximum allowed size of ${config.maxSize} bytes`,
      );
    }

    const mutex = getManifestMutex(id);
    return await mutex.runExclusive(async () => {
      acquireMutex(id);
      try {
        const safeFileName = sanitizeFileName(file.name || "attachment");
        const relativeDir = ATTACHMENT_ENTRY_DIR(id, attachmentId);

        await ensureDirectory(relativeDir);

        const relativeFilePath = ATTACHMENT_FILE_PATH(
          id,
          attachmentId,
          safeFileName,
        );

        const fileBuffer = await file.arrayBuffer();
        await writeFile(relativeFilePath, new Uint8Array(fileBuffer), {
          baseDir: BaseDirectory.Data,
        });

        const manifest = await readManifest(id);
        const entry: ManifestEntry = {
          id: attachmentId,
          fileName: safeFileName,
          mimeType: file.type || "application/octet-stream",
          addedAt: new Date().toISOString(),
          size: file.size,
          ...metadata,
        };

        manifest[attachmentId] = entry;
        await writeManifest(id, manifest);

        const absolutePath = await toAbsolutePath(relativeFilePath);

        return {
          ...(entry as T),
          filePath: absolutePath,
          fileUrl: convertFileSrc(absolutePath),
        };
      } finally {
        releaseMutex(id);
      }
    });
  }

  async function remove(id: string, attachmentId: string) {
    const mutex = getManifestMutex(id);
    return await mutex.runExclusive(async () => {
      acquireMutex(id);
      try {
        const manifest = await readManifest(id);

        if (manifest[attachmentId]) {
          delete manifest[attachmentId];
          await writeManifest(id, manifest);
        }

        const attachmentDir = ATTACHMENT_ENTRY_DIR(id, attachmentId);
        const dirExists = await exists(attachmentDir, {
          baseDir: BaseDirectory.Data,
        });

        if (dirExists) {
          await removeFile(attachmentDir, {
            baseDir: BaseDirectory.Data,
            recursive: true,
          });
        }
      } finally {
        releaseMutex(id);
      }
    });
  }

  async function removeAll(id: string) {
    const baseDir = BASE_DIR(id);
    const dirExists = await exists(baseDir, {
      baseDir: BaseDirectory.Data,
    });

    if (dirExists) {
      await removeFile(baseDir, {
        baseDir: BaseDirectory.Data,
        recursive: true,
      });
    }
  }

  async function readAsDataURL(
    id: string,
    attachmentId: string,
  ): Promise<string | null> {
    const mutex = getManifestMutex(id);
    return await mutex.runExclusive(async () => {
      acquireMutex(id);
      try {
        const manifest = await readManifest(id);
        const entry = manifest[attachmentId];

        if (!entry) {
          return null;
        }

        const relativePath = ATTACHMENT_FILE_PATH(
          id,
          attachmentId,
          entry.fileName,
        );
        const existsOnDisk = await exists(relativePath, {
          baseDir: BaseDirectory.Data,
        });

        if (!existsOnDisk) {
          return null;
        }

        const fileData = await readFile(relativePath, {
          baseDir: BaseDirectory.Data,
        });

        const base64 = btoa(String.fromCharCode(...new Uint8Array(fileData)));

        return `data:${entry.mimeType};base64,${base64}`;
      } finally {
        releaseMutex(id);
      }
    });
  }

  return {
    load,
    save,
    remove,
    removeAll,
    readAsDataURL,
  };
}
