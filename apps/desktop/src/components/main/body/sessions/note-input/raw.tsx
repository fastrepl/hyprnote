import { forwardRef } from "react";

import NoteEditor, { type TiptapEditor } from "@hypr/tiptap/editor";
import type { PlaceholderFunction } from "@hypr/tiptap/shared";
import * as main from "../../../../../store/tinybase/main";

export const RawEditor = forwardRef<{ editor: TiptapEditor | null }, { sessionId: string }>(
  ({ sessionId }, ref) => {
    const value = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);

    const handleRawChange = main.UI.useSetPartialRowCallback(
      "sessions",
      sessionId,
      (input: string) => ({ raw_md: input }),
      [],
      main.STORE_ID,
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
