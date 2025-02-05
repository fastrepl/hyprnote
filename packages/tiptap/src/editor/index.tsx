import { useEffect, forwardRef } from "react";
import {
  EditorContent,
  useEditor,
  type HTMLContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import clsx from "clsx";

import * as shared from "../shared";

export const extensions = [...shared.extensions];

interface EditorProps {
  handleChange: (content: HTMLContent) => void;
  content: HTMLContent;
}

const Editor = forwardRef<{ editor: TiptapEditor | null }, EditorProps>(
  ({ handleChange, content }, ref) => {
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
            "focus:outline-none focus:ring-0 px-4",
          ]),
        },
      },
    });

    useEffect(() => {
      if (editor && editor.isEmpty) {
        editor.commands.setContent(content);
      }
    }, [editor, content]);

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    return (
      <div role="textbox" className={clsx(["relative h-full w-full"])}>
        <EditorContent className="h-full w-full" editor={editor} />
      </div>
    );
  },
);

Editor.displayName = "Editor";

export default Editor;
