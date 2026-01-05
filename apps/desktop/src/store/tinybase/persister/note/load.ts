import { sep } from "@tauri-apps/api/path";
import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import type { EnhancedNoteStorage } from "@hypr/store";
import { md2json } from "@hypr/tiptap/shared";

import { isFileNotFoundError } from "../utils";
import type { NoteFrontmatter } from "./collect";

export type LoadedNoteData = {
  enhanced_notes: Record<string, EnhancedNoteStorage>;
  session_raw_md: Record<string, string>;
};

const LABEL = "NotePersister";

async function loadNotesRecursively(
  sessionsDir: string,
  currentPath: string,
  result: LoadedNoteData,
): Promise<void> {
  const s = sep();
  const fullPath = currentPath
    ? [sessionsDir, currentPath].join(s)
    : sessionsDir;

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(fullPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory) {
      const entryPath = currentPath
        ? [currentPath, entry.name].join(s)
        : entry.name;
      const metaPath = [sessionsDir, entryPath, "_meta.json"].join(s);
      const hasMetaJson = await exists(metaPath);

      if (hasMetaJson) {
        await loadNotesFromSessionDir(sessionsDir, entryPath, result);
      } else {
        await loadNotesRecursively(sessionsDir, entryPath, result);
      }
    }
  }
}

async function loadNotesFromSessionDir(
  sessionsDir: string,
  sessionPath: string,
  result: LoadedNoteData,
): Promise<void> {
  const s = sep();
  const sessionDir = [sessionsDir, sessionPath].join(s);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(sessionDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const filePath = [sessionDir, entry.name].join(s);

    try {
      const content = await readTextFile(filePath);
      const parseResult = await fsSyncCommands.deserialize(content);

      if (parseResult.status === "error") {
        console.error(
          `[${LABEL}] Failed to parse frontmatter from ${filePath}:`,
          parseResult.error,
        );
        continue;
      }

      const { frontmatter, content: markdownBody } = parseResult.data;
      const fm = frontmatter as NoteFrontmatter;

      if (!fm.id || !fm.session_id || !fm.type) {
        continue;
      }

      const tiptapJson = md2json(markdownBody);
      const tiptapContent = JSON.stringify(tiptapJson);

      if (fm.type === "memo") {
        result.session_raw_md[fm.session_id] = tiptapContent;
      } else if (fm.type === "enhanced_note") {
        result.enhanced_notes[fm.id] = {
          user_id: "",
          created_at: new Date().toISOString(),
          session_id: fm.session_id,
          content: tiptapContent,
          template_id: fm.template_id ?? "",
          position: fm.position ?? 0,
          title: fm.title ?? "",
        };
      }
    } catch (error) {
      console.error(`[${LABEL}] Failed to load note from ${filePath}:`, error);
      continue;
    }
  }
}

export async function loadAllNoteData(
  dataDir: string,
): Promise<LoadedNoteData> {
  const result: LoadedNoteData = {
    enhanced_notes: {},
    session_raw_md: {},
  };

  const sessionsDir = [dataDir, "sessions"].join(sep());

  try {
    await loadNotesRecursively(sessionsDir, "", result);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${LABEL}] load error:`, error);
    }
  }

  return result;
}
