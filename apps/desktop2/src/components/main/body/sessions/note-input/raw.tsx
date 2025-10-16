import NoteEditor from "@hypr/tiptap/editor";

import * as persisted from "../../../../../store/tinybase/persisted";

export function RawEditor({ sessionId }: { sessionId: string }) {
  const value = persisted.UI.useCell("sessions", sessionId, "raw_md", persisted.STORE_ID);

  const handleRawChange = persisted.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ raw_md: input }),
    [],
    persisted.STORE_ID,
  );

  return (
    <NoteEditor
      key={`session-${sessionId}-raw`}
      initialContent={value ?? ""}
      handleChange={handleRawChange}
      mentionConfig={{
        trigger: "@",
        handleSearch: async () => {
          return [];
        },
      }}
    />
  );
}
