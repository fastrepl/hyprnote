import "../styles/tiptap.css";
import "../styles/mention.css";

import { Markdown } from "@tiptap/markdown";
import { type Editor as TiptapEditor, EditorContent, type HTMLContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect, useRef } from "react";

import * as shared from "../shared";
import type { PlaceholderFunction } from "../shared/extensions/placeholder";
import { mention, type MentionConfig } from "./mention";

export type { TiptapEditor };

interface EditorProps {
  handleChange: (content: HTMLContent) => void;
  initialContent: HTMLContent;
  editable?: boolean;
  setContentFromOutside?: boolean;
  mentionConfig: MentionConfig;
  placeholderComponent?: PlaceholderFunction;
}

const Editor = forwardRef<{ editor: TiptapEditor | null }, EditorProps>(
  (
    {
      handleChange,
      initialContent,
      editable = true,
      setContentFromOutside = false,
      mentionConfig,
      placeholderComponent,
    },
    ref,
  ) => {
    const previousContentRef = useRef<HTMLContent>(initialContent);

    const onUpdate = ({ editor }: { editor: TiptapEditor }) => {
      if (!editor.isInitialized) {
        return;
      }

      handleChange(editor.getMarkdown());
    };

    const editor = useEditor({
      extensions: [
        ...shared.getExtensions(placeholderComponent),
        mention(mentionConfig),
        Markdown,
      ],
      editable,
      contentType: "markdown",
      content: initialContent || "",
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
        handleKeyDown: (view, event) => {
          const allowedGlobalShortcuts = ["w", "n", "t", ",", "j", "l", "k"];
          if ((event.metaKey || event.ctrlKey) && allowedGlobalShortcuts.includes(event.key)) {
            return false;
          }

          if (event.key === "Backspace") {
            const { state } = view;
            const isAtStart = state.selection.$head.pos === 0;
            if (isAtStart && state.selection.empty) {
              event.preventDefault();
              return true;
            }
          }

          if (event.key === "Tab") {
            event.preventDefault();
            return true;
          }

          return false;
        },
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

    return (
      <div role="textbox">
        <EditorContent editor={editor} />
      </div>
    );
  },
);

Editor.displayName = "Editor";

export default Editor;
