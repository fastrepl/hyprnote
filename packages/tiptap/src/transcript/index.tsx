import { type Editor as TiptapEditor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { SpeakerNode, WordNode } from "./nodes";
import { WordSplit } from "./wordSplit";
import "../styles/transcript.css";

export const extensions = [
  Text,
  Document.configure({ content: "speaker+" }),
  SpeakerNode,
  WordNode,
  WordSplit,
];

interface TranscriptEditorProps {
  initialContent?: Record<string, unknown>;
}

const TranscriptEditor = forwardRef<{ editor: TiptapEditor | null }, TranscriptEditorProps>(
  ({ initialContent }, ref) => {
    const editor = useEditor({
      extensions,
      editable: true,
      content: initialContent || generateDefaultContent(),
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    return (
      <div role="textbox" className="transcript-editor">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

// Helper function to generate default content
function generateDefaultContent() {
  return {
    type: "doc",
    content: [
      {
        type: "speaker",
        content: [
          { type: "word", content: [{ type: "text", text: "Hello" }] },
          { type: "word", content: [{ type: "text", text: "world" }] },
          { type: "word", attrs: { time: 1.5 }, content: [{ type: "text", text: "uh" }] },
          { type: "word", content: [{ type: "text", text: "this" }] },
          { type: "word", content: [{ type: "text", text: "is" }] },
          { type: "word", content: [{ type: "text", text: "a" }] },
          { type: "word", content: [{ type: "text", text: "demo" }] },
        ],
      },
      {
        type: "speaker",
        content: [
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
