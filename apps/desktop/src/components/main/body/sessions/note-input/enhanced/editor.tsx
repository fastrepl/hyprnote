import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";

import { type JSONContent, TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC, isValidTiptapContent } from "@hypr/tiptap/shared";

import * as main from "../../../../../../store/tinybase/main";

export const EnhancedEditor = forwardRef<
  { editor: TiptapEditor | null },
  {
    sessionId: string;
    enhancedNoteId: string;
    onContentChange?: (content: JSONContent) => void;
  }
>(({ enhancedNoteId, onContentChange }, ref) => {
  const store = main.UI.useStore(main.STORE_ID);
  const [initialContent, setInitialContent] =
    useState<JSONContent>(EMPTY_TIPTAP_DOC);

  useEffect(() => {
    if (store) {
      const value = store.getCell("enhanced_notes", enhancedNoteId, "content");
      if (value && typeof value === "string" && value.trim()) {
        try {
          const parsed = JSON.parse(value);
          if (isValidTiptapContent(parsed)) {
            setInitialContent(parsed);
          } else {
            setInitialContent(EMPTY_TIPTAP_DOC);
          }
        } catch {
          setInitialContent(EMPTY_TIPTAP_DOC);
        }
      } else {
        setInitialContent(EMPTY_TIPTAP_DOC);
      }
    }
  }, [store, enhancedNoteId]);

  const saveContent = main.UI.useSetPartialRowCallback(
    "enhanced_notes",
    enhancedNoteId,
    (input: JSONContent) => ({ content: JSON.stringify(input) }),
    [],
    main.STORE_ID,
  );

  const handleChange = useCallback(
    (input: JSONContent) => {
      saveContent(input);
      onContentChange?.(input);
    },
    [saveContent, onContentChange],
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
        key={`enhanced-note-${enhancedNoteId}`}
        initialContent={initialContent}
        handleChange={handleChange}
        mentionConfig={mentionConfig}
      />
    </div>
  );
});
