import { forwardRef, useEffect, useMemo, useState } from "react";

import { type JSONContent, TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";

import * as main from "../../../../../../store/tinybase/main";

export const EnhancedEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const store = main.UI.useStore(main.STORE_ID);
  const [initialContent, setInitialContent] =
    useState<JSONContent>(EMPTY_TIPTAP_DOC);

  useEffect(() => {
    if (store) {
      const value = store.getCell("sessions", sessionId, "enhanced_md");
      if (value && typeof value === "string" && value.trim()) {
        try {
          setInitialContent(JSON.parse(value));
        } catch {
          setInitialContent(EMPTY_TIPTAP_DOC);
        }
      } else {
        setInitialContent(EMPTY_TIPTAP_DOC);
      }
    }
  }, [store, sessionId]);

  const handleChange = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: JSONContent) => ({ enhanced_md: JSON.stringify(input) }),
    [],
    main.STORE_ID,
  );

  const mentionConfig = useMemo(
    () => ({
      trigger: "@",
      handleSearch: async () => {
        return [];
      },
    }),
    [],
  );

  return (
    <div className="h-full">
      <NoteEditor
        ref={ref}
        key={`session-${sessionId}-enhanced`}
        initialContent={initialContent}
        handleChange={handleChange}
        mentionConfig={mentionConfig}
      />
    </div>
  );
});
