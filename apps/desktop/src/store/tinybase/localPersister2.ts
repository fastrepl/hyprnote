import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { type VttWord } from "@hypr/plugin-listener2";
import { type EnhancedNote, type Session } from "@hypr/store";

export type AutoExportOptions = {
  isEnabled: () => boolean;
  isNotesEnabled: () => boolean;
  isTranscriptEnabled: () => boolean;
};

export function createLocalPersister2<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handlePersistEnhancedNote: (
    enhancedNote: EnhancedNote & { id: string },
    filename: string,
  ) => Promise<void>,
  handleSyncToSession: (sessionId: string, content: string) => void,
  handlePersistRawMemo?: (
    session: Session & { id: string },
    filename: string,
  ) => Promise<void>,
  handlePersistTranscript?: (
    sessionId: string,
    words: VttWord[],
  ) => Promise<void>,
  options?: AutoExportOptions,
) {
  // https://tinybase.org/api/persisters/functions/creation/createcustompersister
  return createCustomPersister(
    store,
    async () => {
      return undefined;
    },
    async (getContent, _changes) => {
      if (options && !options.isEnabled()) {
        return;
      }

      const [tables, _values] = getContent();

      const promises: Promise<void>[] = [];

      const shouldExportNotes = !options || options.isNotesEnabled();
      if (shouldExportNotes) {
        Object.entries(tables?.enhanced_notes ?? {}).forEach(([id, row]) => {
          // @ts-ignore
          row.id = id;
          const enhancedNote = row as EnhancedNote & { id: string };

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
            if (enhancedNote.session_id) {
              handleSyncToSession(
                enhancedNote.session_id,
                enhancedNote.content,
              );
            }
          }

          promises.push(handlePersistEnhancedNote(enhancedNote, filename));
        });
      }

      const shouldExportMemo = handlePersistRawMemo && shouldExportNotes;
      if (shouldExportMemo) {
        Object.entries(tables?.sessions ?? {}).forEach(([id, row]) => {
          // @ts-ignore
          row.id = id;
          const session = row as Session & { id: string };

          if (session.raw_md) {
            promises.push(handlePersistRawMemo(session, "_memo.md"));
          }
        });
      }

      const shouldExportTranscript =
        handlePersistTranscript && (!options || options.isTranscriptEnabled());
      if (shouldExportTranscript) {
        const sessionIds = new Set<string>();
        Object.entries(tables?.transcripts ?? {}).forEach(([_id, row]) => {
          // @ts-ignore
          const sessionId = row.session_id as string;
          if (sessionId) {
            sessionIds.add(sessionId);
          }
        });

        for (const sessionId of sessionIds) {
          const words = getWordsForSession(store, sessionId);
          if (words.length > 0) {
            promises.push(handlePersistTranscript(sessionId, words));
          }
        }
      }

      await Promise.all(promises);
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
      });
    }
  }

  return words.sort((a, b) => a.start_ms - b.start_ms);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
