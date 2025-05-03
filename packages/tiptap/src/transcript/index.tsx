import { type Editor as TiptapEditor, type HTMLContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { ConfidenceMark, SentenceNode, SpeakerNode, WordNode } from "./nodes";

export const extensions = [SpeakerNode, SentenceNode, WordNode, ConfidenceMark];

interface TranscriptEditorProps {
  initialContent: HTMLContent;
}

const TranscriptEditor = forwardRef<{ editor: TiptapEditor | null }, TranscriptEditorProps>(
  ({ initialContent }, ref) => {
    const editor = useEditor({
      extensions,
      editable: true,
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

TranscriptEditor.displayName = "TranscriptEditor";

export default TranscriptEditor;
