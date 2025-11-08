import { forwardRef, useEffect, useState } from "react";

import { TiptapEditor } from "@hypr/tiptap/editor";
import NoteEditor from "@hypr/tiptap/editor";

import * as main from "../../../../../../store/tinybase/main";

export const EnhancedEditor = forwardRef<{ editor: TiptapEditor | null }, { sessionId: string }>(
  ({ sessionId }, ref) => {
    const store = main.UI.useStore(main.STORE_ID);
    const [initialContent, setInitialContent] = useState<string>("");

    useEffect(() => {
      if (store) {
        const value = store.getCell("sessions", sessionId, "enhanced_md");
        setInitialContent((value as string) || "");
      }
    }, [store, sessionId]);

    const handleChange = main.UI.useSetPartialRowCallback(
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
          initialContent={initialContent}
          handleChange={handleChange}
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
