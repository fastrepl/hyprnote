import NoteEditor, { type TiptapEditor } from "@hypr/tiptap/editor";
import { downloadDir } from "@tauri-apps/api/path";
import { open as selectFile } from "@tauri-apps/plugin-dialog";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Effect, pipe } from "effect";
import { forwardRef, useCallback } from "react";

import type { PlaceholderFunction } from "@hypr/tiptap/shared";
import { cn } from "@hypr/utils";
import * as persisted from "../../../../../store/tinybase/persisted";
import { commands } from "../../../../../types/tauri.gen";

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
        initialContent={value}
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

    const program = pipe(
      Effect.promise(() => downloadDir()),
      Effect.flatMap((defaultPath) =>
        Effect.promise(() =>
          selectFile({
            title: "Upload Audio or Transcript",
            multiple: false,
            directory: false,
            defaultPath,
            filters: [
              { name: "Audio", extensions: ["wav", "mp3", "ogg"] },
              { name: "Transcript", extensions: ["vtt", "srt"] },
            ],
          })
        )
      ),
      Effect.flatMap((path) => {
        if (!path) {
          return Effect.void;
        }

        if (path.endsWith(".vtt") || path.endsWith(".srt")) {
          return pipe(
            Effect.promise(() => commands.parseSubtitle(path)),
            Effect.tap((subtitle) => Effect.sync(() => console.log(subtitle))),
          );
        }

        return Effect.void;
      }),
    );

    Effect.runPromise(program);
  }, []);

  const isNarrow = useMediaQuery("(max-width: 768px)");

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[#e5e5e5]">
        Take notes or press <kbd>/</kbd> for commands.
      </span>
      <div className={cn("flex flex-row items-center gap-1", isNarrow && "hidden")}>
        <span className="text-[#e5e5e5]">You can also upload/drop an</span>
        <button
          type="button"
          className="text-neutral-400 hover:text-neutral-600 transition-colors underline decoration-dotted hover:decoration-solid"
          onClick={handleFileSelect}
        >
          audio file or transcript file.
        </button>
      </div>
    </div>
  );
};
