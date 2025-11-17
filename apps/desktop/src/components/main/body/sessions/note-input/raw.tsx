import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import NoteEditor, { type TiptapEditor } from "@hypr/tiptap/editor";
import {
  type JSONContent,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";

import * as main from "../../../../../store/tinybase/main";

export const RawEditor = forwardRef<
  { editor: TiptapEditor | null },
  { sessionId: string }
>(({ sessionId }, ref) => {
  const store = main.UI.useStore(main.STORE_ID);
  const loadedSessionIdRef = useRef<string | null>(null);

  const [initialContent, setInitialContent] = useState<JSONContent | undefined>(
    undefined,
  );

  useEffect(() => {
    // Only load content once per session to avoid overwriting user changes
    if (store && loadedSessionIdRef.current !== sessionId) {
      const value = store.getCell("sessions", sessionId, "raw_md");
      if (value) {
        try {
          const jsonContent =
            typeof value === "string" ? JSON.parse(value) : value;
          setInitialContent(jsonContent);
          loadedSessionIdRef.current = sessionId;
        } catch (error) {
          console.error(
            `[RawEditor] Failed to parse raw_md JSON for session ${sessionId}:`,
            error,
          );
          setInitialContent(undefined);
          loadedSessionIdRef.current = sessionId;
        }
      } else {
        setInitialContent(undefined);
        loadedSessionIdRef.current = sessionId;
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
