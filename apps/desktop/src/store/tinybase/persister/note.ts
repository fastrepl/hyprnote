import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands, type JsonValue } from "@hypr/plugin-export";
import { type EnhancedNote, type Session } from "@hypr/store";
import { isValidTiptapContent } from "@hypr/tiptap/shared";

import {
  ensureDirsExist,
  getDataDir,
  getSessionDir,
  sanitizeFilename,
} from "./utils";

type BatchItem = [JsonValue, string];

export function createNotePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handleSyncToSession: (sessionId: string, content: string) => void,
) {
  return createCustomPersister(
    store,
    async () => {
      return undefined;
    },
    async (getContent) => {
      const [tables] = getContent();
      const dataDir = await getDataDir();

      const enhancedNotes = collectEnhancedNoteBatchItems(
        store,
        tables as Record<string, unknown> | undefined,
        dataDir,
        handleSyncToSession,
      );
      const sessions = collectSessionBatchItems(
        tables as Record<string, unknown> | undefined,
        dataDir,
      );
      const batchItems = [...enhancedNotes.items, ...sessions.items];
      const dirsToCreate = new Set([...enhancedNotes.dirs, ...sessions.dirs]);
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
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
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
  enhancedNote: EnhancedNote & { id: string },
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
  tables: Record<string, unknown> | undefined,
  dataDir: string,
  handleSyncToSession: (sessionId: string, content: string) => void,
): { items: BatchItem[]; dirs: Set<string> } {
  const items: BatchItem[] = [];
  const dirs = new Set<string>();

  for (const [id, row] of Object.entries(tables?.enhanced_notes ?? {})) {
    // @ts-ignore
    row.id = id;
    const enhancedNote = row as EnhancedNote & { id: string };

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

    const sessionDir = getSessionDir(dataDir, enhancedNote.session_id);
    dirs.add(sessionDir);
    items.push([parsed, `${sessionDir}/${filename}`]);
  }

  return { items, dirs };
}

function collectSessionBatchItems(
  tables: Record<string, unknown> | undefined,
  dataDir: string,
): { items: BatchItem[]; dirs: Set<string> } {
  const items: BatchItem[] = [];
  const dirs = new Set<string>();

  for (const [id, row] of Object.entries(tables?.sessions ?? {})) {
    // @ts-ignore
    row.id = id;
    const session = row as Session & { id: string };

    if (!session.raw_md) {
      continue;
    }

    const parsed = parseTiptapContent(session.raw_md);
    if (!parsed) {
      continue;
    }

    const sessionDir = getSessionDir(dataDir, session.id);
    dirs.add(sessionDir);
    items.push([parsed, `${sessionDir}/_memo.md`]);
  }

  return { items, dirs };
}
