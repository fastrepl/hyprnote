import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  type Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import { forwardRef, useEffect, useMemo } from "react";
import { useDebounceCallback } from "usehooks-ts";

import "../../styles.css";
import * as shared from "../shared";

export type { TiptapEditor };

interface BlogEditorProps {
  content?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
}

const BlogEditor = forwardRef<{ editor: TiptapEditor | null }, BlogEditorProps>(
  (props, ref) => {
    const { content = "", onChange, editable = true } = props;

    const onUpdate = useDebounceCallback(
      ({ editor }: { editor: TiptapEditor }) => {
        if (!editor.isInitialized || !onChange) {
          return;
        }
        const markdown = editor.storage.markdown.getMarkdown();
        onChange(markdown);
      },
      300,
    );

    const extensions = useMemo(
      () => [
        ...shared.getExtensions(),
        Markdown.configure({
          html: true,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      [],
    );

    const editor = useEditor(
      {
        extensions,
        editable,
        content,
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", "false");
        },
        onUpdate,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
      },
      [extensions],
    );

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor, ref]);

    useEffect(() => {
      if (editor && !editor.isFocused && content !== undefined) {
        const currentMarkdown = editor.storage.markdown?.getMarkdown() || "";
        if (currentMarkdown !== content) {
          editor.commands.setContent(content);
        }
      }
    }, [editor, content]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    return (
      <EditorContent
        editor={editor}
        className="tiptap-root blog-editor"
        role="textbox"
      />
    );
  },
);

BlogEditor.displayName = "BlogEditor";

export default BlogEditor;
