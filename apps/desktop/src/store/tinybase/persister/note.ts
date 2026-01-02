import { sep } from "@tauri-apps/api/path";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands, type JsonValue } from "@hypr/plugin-export";
import type { EnhancedNoteStorage } from "@hypr/store";
import { isValidTiptapContent } from "@hypr/tiptap/shared";

import { StoreOrMergeableStore } from "../store/shared";
import {
  type BatchCollectorResult,
  type BatchItem,
  ensureDirsExist,
  getDataDir,
  getSessionDir,
  iterateTableRows,
  type PersisterMode,
  sanitizeFilename,
  type TablesContent,
} from "./utils";

export function createNotePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handleSyncToSession: (sessionId: string, content: string) => void,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  const loadFn =
    config.mode === "save-only" ? async () => undefined : async () => undefined;

  const saveFn =
    config.mode === "load-only"
      ? async () => {}
      : async () => {
          const tables = store.getTables() as TablesContent | undefined;
          const dataDir = await getDataDir();

          const enhancedNotes = collectEnhancedNoteBatchItems(
            store,
            tables,
            dataDir,
            handleSyncToSession,
          );
          const sessions = collectSessionBatchItems(tables, dataDir);
          const batchItems = [...enhancedNotes.items, ...sessions.items];
          const dirsToCreate = new Set([
            ...enhancedNotes.dirs,
            ...sessions.dirs,
          ]);
          if (batchItems.length === 0) {
            return;
          }

          try {
            await ensureDirsExist(dirsToCreate);
          } catch (e) {
            console.error("Failed to ensure dirs exist:", e);
            return;
          }

          const result = await commands.exportTiptapJsonToMdBatch(batchItems);
          if (result.status === "error") {
            console.error("Failed to export batch:", result.error);
          }
        };

  return createCustomPersister(
    store,
    loadFn,
    saveFn,
    () => null,
    () => {},
    (error) => console.error("[NotePersister]:", error),
    StoreOrMergeableStore,
  );
}

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

function collectEnhancedNoteBatchItems<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  tables: TablesContent | undefined,
  dataDir: string,
  handleSyncToSession: (sessionId: string, content: string) => void,
): BatchCollectorResult<JsonValue> {
  const items: BatchItem<JsonValue>[] = [];
  const dirs = new Set<string>();

  for (const enhancedNote of iterateTableRows(tables, "enhanced_notes")) {
    if (!enhancedNote.content || !enhancedNote.session_id) {
      continue;
    }

    const parsed = parseTiptapContent(enhancedNote.content);
    if (!parsed) {
      continue;
    }

    const filename = getEnhancedNoteFilename(store, enhancedNote);
    if (!enhancedNote.template_id) {
      handleSyncToSession(enhancedNote.session_id, enhancedNote.content);
    }

    const session = tables?.sessions?.[enhancedNote.session_id];
    const folderPath = session?.folder_id ?? "";
    const sessionDir = getSessionDir(
      dataDir,
      enhancedNote.session_id,
      folderPath,
    );
    dirs.add(sessionDir);
    items.push([parsed, [sessionDir, filename].join(sep())]);
  }

  return { items, dirs };
}

function collectSessionBatchItems(
  tables: TablesContent | undefined,
  dataDir: string,
): BatchCollectorResult<JsonValue> {
  const items: BatchItem<JsonValue>[] = [];
  const dirs = new Set<string>();

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
    items.push([parsed, [sessionDir, "_memo.md"].join(sep())]);
  }

  return { items, dirs };
}
