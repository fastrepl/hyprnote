import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";

import NoteEditor, {
  type JSONContent,
  type TiptapEditor,
} from "@hypr/tiptap/editor";
import {
  EMPTY_TIPTAP_DOC,
  type FileHandlerConfig,
  isValidTiptapContent,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";

import * as main from "../../../../../store/tinybase/main";

export const RawEditor = forwardRef<
  { editor: TiptapEditor | null },
  {
    sessionId: string;
    onFilesAdded?: (files: File[], options?: { position?: number }) => void;
    onContentChange?: (content: JSONContent) => void;
  }
>(({ sessionId, onFilesAdded, onContentChange }, ref) => {
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

  const saveContent = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: JSONContent) => ({ raw_md: JSON.stringify(input) }),
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

  const fileHandlerConfig = useMemo(
    () =>
      onFilesAdded
        ? ({
            onDrop: (
              files: File[],
              _editor: TiptapEditor,
              position?: number,
            ) => {
              onFilesAdded(files, { position });
              return false;
            },
            onPaste: (files: File[], editor: TiptapEditor) => {
              const pos = editor.state.selection.from;
              onFilesAdded(files, { position: pos });
              return false;
            },
          } satisfies FileHandlerConfig)
        : undefined,
    [onFilesAdded],
  );

  return (
    <NoteEditor
      ref={ref}
      key={`session-${sessionId}-raw`}
      initialContent={initialContent}
      handleChange={handleChange}
      mentionConfig={mentionConfig}
      placeholderComponent={Placeholder}
      fileHandlerConfig={fileHandlerConfig}
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
