import { mkdir } from "@tauri-apps/plugin-fs";

import { commands as path2Commands } from "@hypr/plugin-path2";

export async function getDataDir(): Promise<string> {
  return path2Commands.base();
}

export function getSessionDir(dataDir: string, sessionId: string): string {
  return `${dataDir}/sessions/${sessionId}`;
}

export async function ensureDirsExist(dirs: Set<string>): Promise<void> {
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes("already exists"))) {
        throw e;
      }
    }
  }
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export function safeParseJson(
  value: unknown,
): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
