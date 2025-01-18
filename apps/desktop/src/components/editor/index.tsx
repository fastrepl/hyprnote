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
import { HTML_ID } from "./extensions";
import { HyprchargeNode } from "./nodes";

import clsx from "clsx";
import "../../styles/tiptap.css";

import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

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
    if (editor.isInitialized) {
      handleChange(editor.getHTML());
    }
  };

  const editor = useEditor({
    extensions,
    content,
    onUpdate,
    editorProps: {
      attributes: {
        class: clsx([
          "prose dark:prose-invert prose-sm",
          "focus:outline-none focus:ring-0",
        ]),
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
    <ScrollArea
      onClick={() => {
        editor?.commands.focus("end");
      }}
      type="auto"
      className="h-[calc(100vh-240px)]"
    >
      <div
        role="textbox"
        className={clsx(["relative h-full w-full"])}
        onClick={handleClickArea}
      >
        <EditorContent className="h-full w-full" editor={editor} />
      </div>
    </ScrollArea>
  );
}
