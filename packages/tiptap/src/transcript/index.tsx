import { type Editor as TiptapEditor, type HTMLContent } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { ConfidenceMark, SentenceNode, SpeakerNode, WordNode } from "./nodes";

export const extensions = [
  Document.configure({ content: "speaker+" }),
  Text,
  Paragraph,
  SpeakerNode,
  SentenceNode,
  WordNode,
  ConfidenceMark,
];

interface TranscriptEditorProps {
  initialContent: Record<string, unknown>;
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
