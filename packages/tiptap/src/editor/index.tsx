import "../styles/tiptap.css";

import { useEffect, forwardRef } from "react";
import {
  EditorContent,
  useEditor,
  type HTMLContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import clsx from "clsx";
import * as shared from "../shared";
import { editorStyle } from "../shared/editorStyle";

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
      onCreate: ({ editor }) => {
        editor.view.dom.setAttribute("spellcheck", "false");
        editor.view.dom.setAttribute("autocomplete", "off");
        editor.view.dom.setAttribute("autocapitalize", "off");
      },
      onUpdate,
      editorProps: {
        attributes: {
          class: clsx(editorStyle),
        },
      },
      autofocus: true,
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

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Backspace" && editor?.state.selection.empty) {
          const isAtStart = editor.state.selection.$head.pos === 0;
          if (isAtStart) {
            e.preventDefault();
          }
        }
      };

      if (editor) {
        editor.view.dom.addEventListener("keydown", handleKeyDown);
      }

      return () => {
        if (editor) {
          editor.view.dom.removeEventListener("keydown", handleKeyDown);
        }
      };
    }, [editor]);

    return (
      <div role="textbox">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

Editor.displayName = "Editor";

export default Editor;
