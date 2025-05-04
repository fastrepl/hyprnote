import { type Editor as TiptapEditor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { SpeakerNode, WordNode } from "./nodes";

export const extensions = [
  Text,
  Document.configure({ content: "speaker+" }),
  SpeakerNode,
  WordNode,
];

interface TranscriptEditorProps {
  initialContent?: Record<string, unknown>;
}

const TranscriptEditor = forwardRef<{ editor: TiptapEditor | null }, TranscriptEditorProps>(
  ({ initialContent }, ref) => {
    const editor = useEditor({
      extensions,
      editable: true,
      content: initialContent,
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    return (
      <div role="textbox">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

TranscriptEditor.displayName = "TranscriptEditor";

export default TranscriptEditor;
