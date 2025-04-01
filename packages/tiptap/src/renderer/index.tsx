import "../styles/tiptap.css";

import { type Editor as TiptapEditor, EditorContent, type HTMLContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";
import * as shared from "../shared";

export const extensions = [...shared.extensions];

interface RendererProps {
  initialContent: HTMLContent;
}

const Renderer = forwardRef<{ editor: TiptapEditor | null }, RendererProps>(
  ({ initialContent }, ref) => {
    const editor = useEditor({
      extensions,
      editable: false,
      shouldRerenderOnTransaction: false,
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    useEffect(() => {
      if (editor) {
        editor.commands.setContent(initialContent);
      }
    }, [editor, initialContent]);

    return (
      <div role="textbox">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

Renderer.displayName = "Renderer";

export default Renderer;
