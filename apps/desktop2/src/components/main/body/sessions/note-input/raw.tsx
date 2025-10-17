import NoteEditor from "@hypr/tiptap/editor";
import { open as selectFile } from "@tauri-apps/plugin-dialog";

import type { PlaceholderFunction } from "@hypr/tiptap/shared";
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
      placeholderComponent={Placeholder}
    />
  );
}

const Placeholder: PlaceholderFunction = ({ node, editor, pos }) => {
  const handleFileSelect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    selectFile({
      title: "Upload Audio or Transcript",
      multiple: false,
      filters: [
        { name: "Audio", extensions: ["wav", "mp3", "ogg"] },
        { name: "Transcript", extensions: ["vtt", "srt"] },
      ],
    }).then((result) => {
      if (result) {
        editor.chain().focus().insertContent(`![${result}](${result})`).run();
      }
    });
  };

  if (node.type.name === "paragraph" && pos === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-gray-400">
          Take notes or press <kbd>/</kbd> for commands.
        </span>
        <div className="flex flex-row items-center gap-1">
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
  }

  return "";
};
