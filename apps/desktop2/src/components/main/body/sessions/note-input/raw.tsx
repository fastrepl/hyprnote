import NoteEditor, { type TiptapEditor } from "@hypr/tiptap/editor";
import { open as selectFile } from "@tauri-apps/plugin-dialog";
import useMediaQuery from "beautiful-react-hooks/useMediaQuery";
import { forwardRef, useCallback } from "react";

import type { PlaceholderFunction } from "@hypr/tiptap/shared";
import { cn } from "@hypr/ui/lib/utils";
import * as persisted from "../../../../../store/tinybase/persisted";

export const RawEditor = forwardRef<{ editor: TiptapEditor | null }, { sessionId: string }>(
  ({ sessionId }, ref) => {
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
        ref={ref}
        key={`session-${sessionId}-raw`}
        initialContent={value ?? ""}
        handleChange={handleRawChange}
        mentionConfig={{
          trigger: "@",
          handleSearch: async () => {
            return [];
          },
        }}
        placeholderComponent={Placeholder}
      />
    );
  },
);

RawEditor.displayName = "RawEditor";

const Placeholder: PlaceholderFunction = ({ node, pos }) => {
  if (node.type.name === "paragraph" && pos === 0) {
    return <PlaceHolderInner />;
  }

  return "";
};

const PlaceHolderInner = () => {
  const handleFileSelect = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    selectFile({
      title: "Upload Audio or Transcript",
      multiple: false,
      filters: [
        { name: "Audio", extensions: ["wav", "mp3", "ogg"] },
        { name: "Transcript", extensions: ["vtt", "srt"] },
      ],
    });
  }, []);

  const isNarrow = useMediaQuery("(max-width: 768px)");

  return (
    <div className="flex flex-col gap-1">
      <span className="text-gray-400">
        Take notes or press <kbd>/</kbd> for commands.
      </span>
      <div className={cn("flex flex-row items-center gap-1", isNarrow && "hidden")}>
        <span className="text-gray-400">You can also upload/drop an</span>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors underline"
          onClick={handleFileSelect}
        >
          audio file or transcript file.
        </button>
      </div>
    </div>
  );
};
