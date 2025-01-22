import { useCallback, useEffect } from "react";

import {
  EditorContent,
  useEditor,
  type HTMLContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import clsx from "clsx";

import { HTML_ID } from "./extensions";
import { HyprchargeNode } from "./nodes";



export const extensions = [
  StarterKit,
  Placeholder.configure({
    placeholder: "Jot down what's important. Hyprnote will handle the rest.",
    emptyEditorClass: clsx([
      "text-lg text-gray-400 first:float-left first:h-0 first:pointer-events-none first:before:content-[attr(data-placeholder)]",
      "tiptap-no-animate",
    ]),
  }),
  Highlight,
  Typography,
  HTML_ID,
  HyprchargeNode,
];

interface EditorProps {
  handleChange: (content: HTMLContent) => void;
  content: HTMLContent;
}

export default function Editor({ handleChange, content }: EditorProps) {
  const onUpdate = ({ editor }: { editor: TiptapEditor }) => {
    if (!editor.isInitialized) {
      return;
    }

    handleChange(editor.getHTML());
  };

  const editor = useEditor({
    extensions,
    onUpdate,
    editorProps: {
      attributes: {
        class: clsx([
          "prose dark:prose-invert prose-md",
          "prose-headings:text-gray-700 prose-p:text-gray-600",
          "prose-p:my-1",
          "prose-headings:font-medium",
          "prose-em:not-italic prose-em:text-black prose-em:font-semibold",
          "focus:outline-none focus:ring-0",
        ]),
      },
    },
  });


  useEffect(() => {
    if (editor && editor.isEmpty) {
      editor.commands.setContent(content);
    }
  }, [content]);

  return (
    <div
      className="h-[calc(100vh-240px)]"
    >
      <div
        role="textbox"
        className={clsx(["relative h-full w-full"])}
      >
        <EditorContent className="h-full w-full" editor={editor} />
      </div>
    </div>
  );
}
