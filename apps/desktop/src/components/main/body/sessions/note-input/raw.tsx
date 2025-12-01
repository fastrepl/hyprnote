import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
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

  const persistChange = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: JSONContent) => ({ raw_md: JSON.stringify(input) }),
    [],
    main.STORE_ID,
  );

  const hasTrackedWriteRef = useRef(false);

  useEffect(() => {
    hasTrackedWriteRef.current = false;
  }, [sessionId]);

  const handleChange = useCallback(
    (input: JSONContent) => {
      persistChange(input);

      if (!hasTrackedWriteRef.current) {
        const hasContent =
          input.content &&
          input.content.some(
            (node: { content?: Array<{ text?: string }> }) =>
              node.content && node.content.some((child) => child.text?.trim()),
          );
        if (hasContent) {
          hasTrackedWriteRef.current = true;
          analyticsCommands.event({ event: "note_written", has_content: true });
        }
      }
    },
    [persistChange],
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
    return (
      <p className="text-[#e5e5e5]">
        Take notes or press <kbd>/</kbd> for commands.
      </p>
    );
  }

  return "";
};
