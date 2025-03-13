import "../styles/tiptap.css";

import { type Editor as TiptapEditor, EditorContent, type HTMLContent, useEditor } from "@tiptap/react";
import clsx from "clsx";
import { forwardRef, useEffect } from "react";
import * as shared from "../shared";
import { editorStyle } from "../shared/editorStyle";

export type { TiptapEditor };
export const extensions = [...shared.extensions];

interface EditorProps {
  handleChange: (content: HTMLContent) => void;
  initialContent: HTMLContent;
  autoFocus?: boolean;
}

const Editor = forwardRef<{ editor: TiptapEditor | null }, EditorProps>(
  ({ handleChange, initialContent, autoFocus = true }, ref) => {
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
      autofocus: autoFocus,
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    useEffect(() => {
      if (editor) {
        editor.commands.setContent(initialContent);
      }
    }, [editor, initialContent]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Backspace" && editor?.state.selection.empty) {
          const isAtStart = editor.state.selection.$head.pos === 0;
          if (isAtStart) {
            e.preventDefault();
          }
        }

        if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault();

          const titleInput = document.getElementById("note-title-input") as HTMLElement;
          if (titleInput) {
            titleInput.focus();
          }
        }

        if (e.key === "ArrowUp" && editor?.state.selection.empty) {
          const { from } = editor.state.selection;
          const resolvedPos = editor.state.doc.resolve(from);

          const isFirstNode = resolvedPos.depth > 0 && resolvedPos.index(0) === 0;

          if (isFirstNode) {
            e.preventDefault();
            const titleInput = document.getElementById("note-title-input") as HTMLInputElement;
            if (titleInput) {
              titleInput.focus();

              const length = titleInput.value.length;
              titleInput.setSelectionRange(length, length);
            }
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
