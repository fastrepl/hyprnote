import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import { TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import { type JSONContent } from "@hypr/tiptap/shared";

import * as main from "../../../../../../store/tinybase/main";

export const EnhancedEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const store = main.UI.useStore(main.STORE_ID);
  const loadedNoteIdRef = useRef<string | null>(null);
  const [initialContent, setInitialContent] = useState<JSONContent | undefined>(
    undefined,
  );

  useEffect(() => {
    // Only load content once per enhanced note to avoid overwriting user changes
    if (store && loadedNoteIdRef.current !== enhancedNoteId) {
      const value = store.getCell("enhanced_notes", enhancedNoteId, "content");
      if (value) {
        try {
          const jsonContent =
            typeof value === "string" ? JSON.parse(value) : value;
          setInitialContent(jsonContent);
          loadedNoteIdRef.current = enhancedNoteId;
        } catch (error) {
          console.error(
            `[EnhancedEditor] Failed to parse enhanced note content JSON for note ${enhancedNoteId}:`,
            error,
          );
          setInitialContent(undefined);
          loadedNoteIdRef.current = enhancedNoteId;
        }
      } else {
        setInitialContent(undefined);
        loadedNoteIdRef.current = enhancedNoteId;
      }
    }
  }, [store, enhancedNoteId]);

  const handleChange = main.UI.useSetPartialRowCallback(
    "enhanced_notes",
    enhancedNoteId,
    (input: JSONContent) => ({ content: JSON.stringify(input) }),
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
