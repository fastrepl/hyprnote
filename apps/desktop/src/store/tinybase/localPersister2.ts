import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands, type JsonValue } from "@hypr/plugin-export";
import { type VttWord } from "@hypr/plugin-listener2";
import { commands as path2Commands } from "@hypr/plugin-path2";
import { type EnhancedNote, type Session } from "@hypr/store";
import { isValidTiptapContent } from "@hypr/tiptap/shared";

export type AutoExportOptions = {
  notes?: () => boolean;
  transcript?: () => boolean;
};

export function createLocalPersister2<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handleSyncToSession: (sessionId: string, content: string) => void,
  handlePersistTranscript?: (
    sessionId: string,
    words: VttWord[],
  ) => Promise<void>,
  isEnabled?: AutoExportOptions,
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

      const dataDir = await path2Commands.base();

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

      if (batchItems.length > 0) {
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
      }

      const shouldExportTranscript =
        handlePersistTranscript &&
        (!isEnabled?.transcript || isEnabled.transcript());
      if (shouldExportTranscript) {
        const sessionIds = new Set<string>();
        Object.entries(tables?.transcripts ?? {}).forEach(([_id, row]) => {
          // @ts-ignore
          const sessionId = row.session_id as string;
          if (sessionId) {
            sessionIds.add(sessionId);
          }
        });

        const transcriptPromises: Promise<void>[] = [];
        for (const sessionId of sessionIds) {
          const words = getWordsForSession(store, sessionId);
          if (words.length > 0) {
            transcriptPromises.push(handlePersistTranscript(sessionId, words));
          }
        }

        if (transcriptPromises.length > 0) {
          await Promise.all(transcriptPromises);
        }
      }
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
  );
}

function getWordsForSession<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  sessionId: string,
): VttWord[] {
  const words: VttWord[] = [];

  // @ts-ignore - accessing tables dynamically
  const transcriptsTable = store.getTable("transcripts") ?? {};
  const transcriptIds = new Set<string>();

  for (const [transcriptId, transcript] of Object.entries(transcriptsTable)) {
    // @ts-ignore
    if (transcript.session_id === sessionId) {
      transcriptIds.add(transcriptId);
    }
  }

  // @ts-ignore - accessing tables dynamically
  const wordsTable = store.getTable("words") ?? {};

  for (const [_wordId, word] of Object.entries(wordsTable)) {
    // @ts-ignore
    if (transcriptIds.has(word.transcript_id)) {
      words.push({
        // @ts-ignore
        text: word.text as string,
        // @ts-ignore
        start_ms: word.start_ms as number,
        // @ts-ignore
        end_ms: word.end_ms as number,
        // @ts-ignore
        speaker: (word.speaker as string) ?? null,
      });
    }
  }

  return words.sort((a, b) => a.start_ms - b.start_ms);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
