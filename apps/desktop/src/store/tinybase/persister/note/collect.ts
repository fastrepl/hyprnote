import { sep } from "@tauri-apps/api/path";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { EnhancedNoteStorage } from "@hypr/store";
import { isValidTiptapContent } from "@hypr/tiptap/shared";

import {
  type CollectorResult,
  getSessionDir,
  iterateTableRows,
  type JsonValue,
  sanitizeFilename,
  type TablesContent,
} from "../utils";

function parseTiptapContent(content: string): JsonValue | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  if (!isValidTiptapContent(parsed)) {
    return undefined;
  }

  return parsed as JsonValue;
}

function getEnhancedNoteFilename<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  enhancedNote: EnhancedNoteStorage & { id: string },
): string {
  if (enhancedNote.template_id) {
    // @ts-ignore
    const templateTitle = store.getCell(
      "templates",
      enhancedNote.template_id,
      "title",
    ) as string | undefined;
    const safeName = sanitizeFilename(
      templateTitle || enhancedNote.template_id,
    );
    return `${safeName}.md`;
  }
  return "_summary.md";
}

export function collectNoteWriteOps<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  tables: TablesContent,
  dataDir: string,
  handleSyncToSession?: (sessionId: string, content: string) => void,
): CollectorResult {
  const dirs = new Set<string>();
  const mdBatchItems: Array<[JsonValue, string]> = [];

  for (const enhancedNote of iterateTableRows(tables, "enhanced_notes")) {
    if (!enhancedNote.content || !enhancedNote.session_id) {
      continue;
    }

    const parsed = parseTiptapContent(enhancedNote.content);
    if (!parsed) {
      continue;
    }

    const filename = getEnhancedNoteFilename(store, enhancedNote);
    if (!enhancedNote.template_id && handleSyncToSession) {
      handleSyncToSession(enhancedNote.session_id, enhancedNote.content);
    }

    const session = tables.sessions?.[enhancedNote.session_id];
    const folderPath = session?.folder_id ?? "";
    const sessionDir = getSessionDir(
      dataDir,
      enhancedNote.session_id,
      folderPath,
    );
    dirs.add(sessionDir);
    mdBatchItems.push([parsed, [sessionDir, filename].join(sep())]);
  }

  for (const session of iterateTableRows(tables, "sessions")) {
    if (!session.raw_md) {
      continue;
    }

    const parsed = parseTiptapContent(session.raw_md);
    if (!parsed) {
      continue;
    }

    const folderPath = session.folder_id ?? "";
    const sessionDir = getSessionDir(dataDir, session.id, folderPath);
    dirs.add(sessionDir);
    mdBatchItems.push([parsed, [sessionDir, "_memo.md"].join(sep())]);
  }

  const operations: CollectorResult["operations"] = [];
  if (mdBatchItems.length > 0) {
    operations.push({ type: "md-batch", items: mdBatchItems });
  }

  return { dirs, operations };
}
