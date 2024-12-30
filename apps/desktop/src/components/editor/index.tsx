import { useEffect } from "react";

import { type SuggestionOptions } from "@tiptap/suggestion";
import {
  BubbleMenu,
  EditorProvider,
  FloatingMenu,
  useCurrentEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";

import tippy from "tippy.js";

const extensions = [StarterKit];

const content = "<p>Hello World!</p>";

export default function Editor() {
  return (
    <EditorProvider extensions={extensions} content={content}>
      <FloatingMenu editor={null}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={null}>This is the bubble menu</BubbleMenu>
    </EditorProvider>
  );
}
