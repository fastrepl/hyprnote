import { forwardRef, useEffect, useMemo, useState } from "react";

import NoteEditor, {
  type JSONContent,
  type TiptapEditor,
} from "@hypr/tiptap/editor";
import {
  EMPTY_TIPTAP_DOC,
  isValidTiptapContent,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";

import * as main from "../../../../../store/tinybase/main";

export const RawEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const store = main.UI.useStore(main.STORE_ID);

  const [initialContent, setInitialContent] =
    useState<JSONContent>(EMPTY_TIPTAP_DOC);

  useEffect(() => {
    if (store) {
      const value = store.getCell("sessions", sessionId, "raw_md");
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
  }, [store, sessionId]);

  const handleChange = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: JSONContent) => ({ raw_md: JSON.stringify(input) }),
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
    <NoteEditor
      ref={ref}
      key={`session-${sessionId}-raw`}
      initialContent={initialContent}
      handleChange={handleChange}
      mentionConfig={mentionConfig}
      placeholderComponent={Placeholder}
    />
  );
});

const Placeholder: PlaceholderFunction = ({ node, pos }) => {
  if (node.type.name === "paragraph" && pos === 0) {
    return <PlaceHolderInner />;
  }

  return "";
};

const PlaceHolderInner = () => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[#e5e5e5]">
        Take notes or press <kbd>/</kbd> for commands.
      </span>
    </div>
  );
};
