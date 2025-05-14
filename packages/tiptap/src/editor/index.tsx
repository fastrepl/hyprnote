import "../styles/tiptap.css";

import { type Editor as TiptapEditor, EditorContent, type HTMLContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect, useRef } from "react";

import * as shared from "../shared";

export type { TiptapEditor };

interface EditorProps {
  handleChange: (content: HTMLContent) => void;
  initialContent: HTMLContent;
  editable?: boolean;
  setContentFromOutside?: boolean;
}

const Editor = forwardRef<{ editor: TiptapEditor | null }, EditorProps>(
  ({ handleChange, initialContent, editable = true, setContentFromOutside = false }, ref) => {
    const previousContentRef = useRef<HTMLContent>(initialContent);

    const onUpdate = ({ editor }: { editor: TiptapEditor }) => {
      if (!editor.isInitialized) {
        return;
      }

      handleChange(editor.getHTML());
    };

    const editor = useEditor({
      extensions: shared.extensions,
      editable,
      content: initialContent || "<p></p>",
      onCreate: ({ editor }) => {
        editor.view.dom.setAttribute("spellcheck", "false");
        editor.view.dom.setAttribute("autocomplete", "off");
        editor.view.dom.setAttribute("autocapitalize", "off");
      },
      onUpdate,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: "tiptap-normal",
        },
        scrollThreshold: 32,
        scrollMargin: 32,
      },
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    useEffect(() => {
      if (editor && (setContentFromOutside || previousContentRef.current !== initialContent)) {
        previousContentRef.current = initialContent;
        if (setContentFromOutside) {
          const { from, to } = editor.state.selection;
          editor.commands.setContent(initialContent);
          editor.commands.markNewContent();

          if (from > 0 && to > 0 && from < editor.state.doc.content.size) {
            editor.commands.setTextSelection({ from, to });
          }
        } else if (!editor.isFocused) {
          editor.commands.setContent(initialContent);
        }
      }
    }, [editor, initialContent, setContentFromOutside]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Backspace" && editor?.state.selection.empty) {
          const isAtStart = editor.state.selection.$head.pos === 0;
          if (isAtStart) {
            e.preventDefault();
          }
        }

        if (e.key === "Tab") {
          e.preventDefault();
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
