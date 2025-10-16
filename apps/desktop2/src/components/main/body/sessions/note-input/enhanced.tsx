import NoteEditor from "@hypr/tiptap/editor";

import * as persisted from "../../../../../store/tinybase/persisted";

export function EnhancedEditor({ sessionId }: { sessionId: string }) {
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
}
