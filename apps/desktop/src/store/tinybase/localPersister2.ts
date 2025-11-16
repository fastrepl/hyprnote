import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { json2md } from "@hypr/tiptap/shared";

import { Session } from "./schema-external";

// https://tinybase.org/api/persisters/functions/creation/createcustompersister
export function createLocalPersister2<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  handlePersist: (
    session: Session & { id: string },
    markdownContent: string,
  ) => Promise<void>,
) {
  return createCustomPersister(
    store,
    async () => {
      return undefined;
    },
    async (getContent, _changes) => {
      const [tables, _values] = getContent();

      Object.entries(tables?.sessions ?? {}).forEach(([id, row]) => {
        // @ts-ignore
        row.id = id;
        const session = row as Session & { id: string };

        // Convert enhanced_md JSON to markdown using tiptap utility
        let markdownContent = "";
        if (session.enhanced_md) {
          try {
            // session.enhanced_md is expected to be a stringified JSON
            // Validate it's valid JSON before passing to json2md
            if (typeof session.enhanced_md === "string") {
              // Try to parse to validate it's valid JSON
              const parsed = JSON.parse(session.enhanced_md);
              if (parsed && typeof parsed === "object" && parsed.type === "doc") {
                markdownContent = json2md(session.enhanced_md);
              } else {
                console.error(
                  `[localPersister2] Invalid Tiptap document structure for session ${id}:`,
                  parsed,
                );
              }
            } else {
              // If it's not a string, it might be the JSON object itself
              markdownContent = json2md(session.enhanced_md);
            }
          } catch (error) {
            console.error(
              `[localPersister2] Failed to convert enhanced_md to markdown for session ${id}:`,
              error,
            );
            // Continue with empty markdown content to prevent data loss for other sessions
          }
        }

        handlePersist(session, markdownContent);
      });
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
  );
}
