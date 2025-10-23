import { forwardRef } from "react";

import { TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import * as persisted from "../../../../../../store/tinybase/persisted";

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
      <div className="h-full">
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
      </div>
    );
  },
);
