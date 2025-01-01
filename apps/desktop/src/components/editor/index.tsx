import { useEffect } from "react";

import {
  EditorContent,
  useEditor,
  type JSONContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import { UniqueID, HTML_ID } from "./extensions";

import "../../styles/tiptap.css";

export const extensions = [
  StarterKit,
  Placeholder,
  Highlight,
  Typography,
  UniqueID,
  HTML_ID,
];

interface EditorProps {
  handleChange: (content: JSONContent) => void;
  content: JSONContent;
}

export default function Editor({ handleChange, content }: EditorProps) {
  const onUpdate = ({ editor }: { editor: TiptapEditor }) => {
    if (editor.isInitialized) {
      handleChange(editor.getJSON());
    }
  };

  const editor = useEditor({
    extensions,
    content,
    onUpdate,
  });

  useEffect(() => {
    if (editor && editor.isInitialized) {
      editor.commands.setContent(content);
    }
  }, [content]);

  return (
    <>
      <EditorContent editor={editor} />
    </>
  );
}
