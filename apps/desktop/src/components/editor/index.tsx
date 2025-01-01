import { BubbleMenu, EditorProvider, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import { UniqueID, HTML_ID } from "./extensions";

import "../../styles/tiptap.css";

const extensions = [
  StarterKit,
  Placeholder,
  Highlight,
  Typography,
  UniqueID,
  HTML_ID,
];

const content = "<p>Hello World!</p>";

export default function Editor() {
  return (
    <EditorProvider extensions={extensions} content={content} editorProps={{}}>
      <FloatingMenu editor={null}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={null}>This is the bubble menu</BubbleMenu>
    </EditorProvider>
  );
}
