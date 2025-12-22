import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands, type JsonValue } from "@hypr/plugin-export";
import { type EnhancedNote, type Session } from "@hypr/store";
import { isValidTiptapContent } from "@hypr/tiptap/shared";

export function createLocalPersister2<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handleSyncToSession: (sessionId: string, content: string) => void,
  isEnabled?: { notes?: () => boolean },
) {
  // https://tinybase.org/api/persisters/functions/creation/createcustompersister
  return createCustomPersister(
    store,
    async () => {
      return undefined;
    },
    async (getContent, _changes) => {
      if (isEnabled?.notes && !isEnabled.notes()) {
        return;
      }

      const [tables, _values] = getContent();

      const batchItems: [JsonValue, string][] = [];
      const dirsToCreate = new Set<string>();

      const dataDir = await appDataDir();

      for (const [id, row] of Object.entries(tables?.enhanced_notes ?? {})) {
        // @ts-ignore
        row.id = id;
        const enhancedNote = row as EnhancedNote & { id: string };

        if (!enhancedNote.content || !enhancedNote.session_id) {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(enhancedNote.content);
        } catch {
          continue;
        }

        if (!isValidTiptapContent(parsed)) {
          continue;
        }

        let filename: string;
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
          filename = `${safeName}.md`;
        } else {
          filename = "_summary.md";
          handleSyncToSession(enhancedNote.session_id, enhancedNote.content);
        }

        const sessionDir = `${dataDir}hyprnote/sessions/${enhancedNote.session_id}`;
        dirsToCreate.add(sessionDir);
        batchItems.push([parsed as JsonValue, `${sessionDir}/${filename}`]);
      }

      for (const [id, row] of Object.entries(tables?.sessions ?? {})) {
        // @ts-ignore
        row.id = id;
        const session = row as Session & { id: string };

        if (!session.raw_md) {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(session.raw_md);
        } catch {
          continue;
        }

        if (!isValidTiptapContent(parsed)) {
          continue;
        }

        const sessionDir = `${dataDir}hyprnote/sessions/${session.id}`;
        dirsToCreate.add(sessionDir);
        batchItems.push([parsed as JsonValue, `${sessionDir}/_memo.md`]);
      }

      if (batchItems.length === 0) {
        return;
      }

      await Promise.all(
        [...dirsToCreate].map(async (dir) => {
          if (!(await exists(dir))) {
            await mkdir(dir, { recursive: true });
          }
        }),
      );

      const result = await commands.exportTiptapJsonToMdBatch(batchItems);
      if (result.status === "error") {
        console.error("Failed to export batch:", result.error);
      }
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
