import {
  EditorContent,
  type JSONContent,
  type Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import "requestidlecallback-polyfill";
import { useDebounceCallback } from "usehooks-ts";

import "../../styles.css";
import * as shared from "../shared";
import type { PlaceholderFunction } from "../shared/extensions/placeholder";
import { mention, type MentionConfig } from "./mention";

export type { JSONContent, TiptapEditor };

interface EditorProps {
  handleChange?: (content: JSONContent) => void;
  initialContent?: JSONContent;
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
    const previousContentRef = useRef<JSONContent>(initialContent);

    const onUpdate = useDebounceCallback(
      ({ editor }: { editor: TiptapEditor }) => {
        if (!editor.isInitialized || !handleChange) {
          return;
        }

        requestIdleCallback(() => {
          const content = editor.getJSON();
          handleChange(content);
        });
      },
      500,
    );

    const extensions = useMemo(
      () => [
        ...shared.getExtensions(placeholderComponent),
        mention(mentionConfig),
      ],
      [mentionConfig, placeholderComponent],
    );

    const editorProps: Parameters<typeof useEditor>[0]["editorProps"] = useMemo(
      () => ({
        attributes: {
          class: "tiptap-normal",
        },
        scrollThreshold: 32,
        scrollMargin: 32,
        handleKeyDown: (view, event) => {
          const allowedGlobalShortcuts = ["w", "n", "t", ",", "j", "l", "k"];
          if (
            (event.metaKey || event.ctrlKey) &&
            allowedGlobalShortcuts.includes(event.key)
          ) {
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
      }),
      [],
    );

    const editor = useEditor(
      {
        extensions,
        editable,
        content: initialContent || shared.EMPTY_TIPTAP_DOC,
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", "false");
          editor.view.dom.setAttribute("autocomplete", "off");
          editor.view.dom.setAttribute("autocapitalize", "off");
        },
        onUpdate,
        immediatelyRender: true,
        shouldRerenderOnTransaction: false,
        parseOptions: { preserveWhitespace: "full" },
        editorProps,
      },
      [extensions],
    );

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor]);

    useEffect(() => {
      if (
        editor &&
        (setContentFromOutside || previousContentRef.current !== initialContent)
      ) {
        previousContentRef.current = initialContent;
        if (setContentFromOutside) {
          const { from, to } = editor.state.selection;
          if (initialContent) {
            editor.commands.markNewContent();
          }

          if (from > 0 && to > 0 && from < editor.state.doc.content.size) {
            editor.commands.setTextSelection({ from, to });
          }
        } else if (!editor.isFocused) {
          if (initialContent) {
            editor.commands.setContent(initialContent, {
              parseOptions: { preserveWhitespace: "full" },
            });
          }
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
