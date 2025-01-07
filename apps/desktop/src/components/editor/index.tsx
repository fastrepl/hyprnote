import { useCallback, useEffect } from "react";

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
import { HyprchargeNode } from "./nodes";

import clsx from "clsx";
import "../../styles/tiptap.css";

export const extensions = [
  StarterKit,
  Placeholder.configure({
    placeholder: "Welcome to Hyprnote!",
    emptyEditorClass:
      "text-lg text-gray-400 first:float-left first:h-0 first:pointer-events-none first:before:content-[attr(data-placeholder)]",
  }),
  Highlight,
  Typography,
  UniqueID,
  HTML_ID,
  HyprchargeNode,
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
    editorProps: {
      attributes: {
        class: clsx(["focus:outline-none focus:ring-0"]),
      },
    },
  });

  const handleClickArea = useCallback(() => {
    editor?.commands.focus("end");
  }, [editor]);

  useEffect(() => {
    if (editor && editor.isInitialized) {
      editor.commands.setContent(content);
    }
  }, [content]);

  return (
    <div
      role="textbox"
      className={clsx(["relative h-full w-full"])}
      onClick={handleClickArea}
    >
      <EditorContent className="h-full w-full" editor={editor} />
    </div>
  );
}
