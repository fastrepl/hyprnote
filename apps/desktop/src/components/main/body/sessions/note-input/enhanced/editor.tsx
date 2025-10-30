import { forwardRef } from "react";

import { TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";
import * as main from "../../../../../../store/tinybase/main";

export const EnhancedEditor = forwardRef<{ editor: TiptapEditor | null }, { sessionId: string }>(
  ({ sessionId }, ref) => {
    const value = main.UI.useCell("sessions", sessionId, "enhanced_md", main.STORE_ID);

    const handleEnhancedChange = (c: string) => {
      console.log("handleEnhancedChange", c);
      _handleEnhancedChange(c);
    };

    const _handleEnhancedChange = main.UI.useSetPartialRowCallback(
      "sessions",
      sessionId,
      (input: string) => ({ enhanced_md: input }),
      [],
      main.STORE_ID,
    );

    return (
      <div className="h-full">
        <NoteEditor
          ref={ref}
          key={`session-${sessionId}-enhanced`}
          initialContent={value}
          handleChange={handleEnhancedChange}
          mentionConfig={{
            trigger: "@",
            handleSearch: async () => {
              return [];
            },
          }}
        />
      </div>
    );
  },
);
