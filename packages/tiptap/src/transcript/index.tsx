import { type Editor as TiptapEditor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { WordSplit } from "./extensions";
import { SpeakerNode, WordNode } from "./nodes";
import "../styles/transcript.css";

export const extensions = [
  Document.configure({ content: "speaker+" }),
  History,
  Text,
  SpeakerNode,
  WordNode,
  WordSplit,
];

interface TranscriptEditorProps {
  editable?: boolean;
  initialContent: Record<string, unknown>;
}

const TranscriptEditor = forwardRef<{ editor: TiptapEditor | null }, TranscriptEditorProps>(
  ({ initialContent, editable = true }, ref) => {
    const editor = useEditor({
      extensions,
      editable,
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editable]);

    useEffect(() => {
      if (editor) {
        editor.commands.setContent(initialContent);
      }
    }, [editor, initialContent]);

    return (
      <div role="textbox" className="transcript-editor">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

function generateDefaultContent() {
  return {
    type: "doc",
    content: [
      {
        type: "speaker",
        attrs: { label: "" },
        content: [
          { type: "word", content: [{ type: "text", text: "Hello" }] },
          { type: "word", content: [{ type: "text", text: "world" }] },
          { type: "word", content: [{ type: "text", text: "uh" }] },
          { type: "word", content: [{ type: "text", text: "this" }] },
          { type: "word", content: [{ type: "text", text: "is" }] },
          { type: "word", content: [{ type: "text", text: "a" }] },
          { type: "word", content: [{ type: "text", text: "demo" }] },
          { type: "word", content: [{ type: "text", text: "Let's" }] },
          { type: "word", content: [{ type: "text", text: "try" }] },
          { type: "word", content: [{ type: "text", text: "another" }] },
          { type: "word", content: [{ type: "text", text: "speaker" }] },
        ],
      },
    ],
  };
}

TranscriptEditor.displayName = "TranscriptEditor";

export default TranscriptEditor;
