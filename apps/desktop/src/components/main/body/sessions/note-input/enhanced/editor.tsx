import { forwardRef, useMemo } from "react";

import { type JSONContent, TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC, isValidTiptapContent } from "@hypr/tiptap/shared";

import { useImageUpload } from "../../../../../../hooks/useImageUpload";
import * as main from "../../../../../../store/tinybase/store/main";

export const EnhancedEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string; enhancedNoteId: string; onNavigateToTitle?: () => void }
>(({ sessionId, enhancedNoteId, onNavigateToTitle }, ref) => {
  const onImageUpload = useImageUpload(sessionId);
  const content = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "content",
    main.STORE_ID,
  );

  const initialContent = useMemo<JSONContent>(() => {
    if (typeof content !== "string" || !content.trim()) {
      return EMPTY_TIPTAP_DOC;
    }

    try {
      const parsed = JSON.parse(content);
      return isValidTiptapContent(parsed) ? parsed : EMPTY_TIPTAP_DOC;
    } catch {
      return EMPTY_TIPTAP_DOC;
    }
  }, [content]);

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

  const fileHandlerConfig = useMemo(
    () => ({ onImageUpload }),
    [onImageUpload],
  );

  return (
    <div className="h-full">
      <NoteEditor
        ref={ref}
        key={`enhanced-note-${enhancedNoteId}`}
        initialContent={initialContent}
        handleChange={handleChange}
        mentionConfig={mentionConfig}
        onNavigateToTitle={onNavigateToTitle}
        fileHandlerConfig={fileHandlerConfig}
      />
    </div>
  );
});
