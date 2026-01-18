import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  type Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import "../../styles.css";
import * as shared from "../shared";
import { GoogleDocsImport } from "./google-docs-import";
import { Toolbar } from "./toolbar";

export type { TiptapEditor };

interface BlogEditorProps {
  content?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  onGoogleDocsImport?: (url: string) => void;
  isImporting?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  onAddImageFromLibrary?: () => void;
}

const BlogEditor = forwardRef<{ editor: TiptapEditor | null }, BlogEditorProps>(
  (props, ref) => {
    const {
      content = "",
      onChange,
      editable = true,
      onGoogleDocsImport,
      isImporting,
      onImageUpload,
      onAddImageFromLibrary,
    } = props;
    const [isEmpty, setIsEmpty] = useState(!content || content.trim() === "");

    const onUpdate = useDebounceCallback(
      ({ editor }: { editor: TiptapEditor }) => {
        if (!editor.isInitialized || !onChange) {
          return;
        }
        const json = editor.getJSON();
        const markdown = (editor as any).markdown.serialize(json);
        onChange(markdown);
        setIsEmpty(editor.isEmpty);
      },
      300,
    );

    const extensions = useMemo(
      () => [
        ...shared.getExtensions(
          undefined,
          onImageUpload
            ? {
                onImageUpload,
              }
            : undefined,
        ),
        Markdown,
      ],
      [onImageUpload],
    );

    const editor = useEditor(
      {
        extensions,
        editable,
        content,
        contentType: "markdown",
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", "false");
          setIsEmpty(editor.isEmpty);
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
        const json = editor.getJSON();
        const currentMarkdown = (editor as any).markdown?.serialize(json) || "";
        if (currentMarkdown !== content) {
          editor.commands.setContent(content, { contentType: "markdown" });
          setIsEmpty(!content || content.trim() === "");
        }
      }
    }, [editor, content]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    const showImportOverlay = isEmpty && onGoogleDocsImport && editable;

    return (
      <div className="relative flex flex-col">
        {editable && (
          <Toolbar editor={editor} onAddImage={onAddImageFromLibrary} />
        )}
        <EditorContent
          editor={editor}
          className="tiptap-root blog-editor"
          role="textbox"
        />
        {showImportOverlay && (
          <GoogleDocsImport
            onImport={onGoogleDocsImport}
            isLoading={isImporting}
          />
        )}
      </div>
    );
  },
);

BlogEditor.displayName = "BlogEditor";

export default BlogEditor;
