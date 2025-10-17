import NoteEditor, { type TiptapEditor } from "@hypr/tiptap/editor";
import { forwardRef } from "react";

import * as persisted from "../../../../../store/tinybase/persisted";

export const EnhancedEditor = forwardRef<{ editor: TiptapEditor | null }, { sessionId: string }>(
  ({ sessionId }, ref) => {
    const value = persisted.UI.useCell("sessions", sessionId, "enhanced_md", persisted.STORE_ID);

    const handleEnhancedChange = persisted.UI.useSetPartialRowCallback(
      "sessions",
      sessionId,
      (input: string) => ({ enhanced_md: input }),
      [],
      persisted.STORE_ID,
    );

    return (
      <NoteEditor
        ref={ref}
        key={`session-${sessionId}-enhanced`}
        initialContent={value ?? ""}
        handleChange={handleEnhancedChange}
        mentionConfig={{
          trigger: "@",
          handleSearch: async () => {
            return [];
          },
        }}
      />
    );
  },
);

EnhancedEditor.displayName = "EnhancedEditor";
