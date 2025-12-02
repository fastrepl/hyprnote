import {
  EditorContent,
  type JSONContent,
  type Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import { forwardRef, useEffect, useMemo, useRef } from "react";

import "../../styles.css";
import { mention, type MentionConfig } from "../editor/mention";
import * as shared from "../shared";
import type { PlaceholderFunction } from "../shared/extensions/placeholder";

export type { JSONContent, TiptapEditor };
export type { MentionConfig };

export interface SlashCommandConfig {
  handleSearch: (
    query: string,
  ) => Promise<{ id: string; type: string; label: string }[]>;
}

interface ChatEditorProps {
  initialContent?: JSONContent;
  editable?: boolean;
  placeholderComponent?: PlaceholderFunction;
  slashCommandConfig?: SlashCommandConfig;
}

const ChatEditor = forwardRef<{ editor: TiptapEditor | null }, ChatEditorProps>(
  (
    {
      initialContent,
      editable = true,
      placeholderComponent,
      slashCommandConfig,
    },
    ref,
  ) => {
    const previousContentRef = useRef<JSONContent>(initialContent);

    const mentionConfigs = useMemo(() => {
      const configs: MentionConfig[] = [];

      if (slashCommandConfig) {
        configs.push({
          trigger: "/",
          handleSearch: slashCommandConfig.handleSearch,
        });
      }

      return configs;
    }, [slashCommandConfig]);

    const extensions = useMemo(
      () => [
        ...shared.getExtensions(placeholderComponent),
        ...mentionConfigs.map((config) => mention(config)),
      ],
      [mentionConfigs, placeholderComponent],
    );

    const editor = useEditor(
      {
        extensions,
        editable,
        content: shared.isValidTiptapContent(initialContent)
          ? initialContent
          : shared.EMPTY_TIPTAP_DOC,
        onCreate: ({ editor }) => {
          editor.view.dom.setAttribute("spellcheck", "false");
          editor.view.dom.setAttribute("autocomplete", "off");
          editor.view.dom.setAttribute("autocapitalize", "off");
        },
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        parseOptions: { preserveWhitespace: "full" },
      },
      [extensions],
    );

    useEffect(() => {
      if (ref && typeof ref === "object") {
        ref.current = { editor };
      }
    }, [editor, ref]);

    useEffect(() => {
      if (editor && previousContentRef.current !== initialContent) {
        previousContentRef.current = initialContent;
        if (!editor.isFocused) {
          if (shared.isValidTiptapContent(initialContent)) {
            editor.commands.setContent(initialContent, {
              parseOptions: { preserveWhitespace: "full" },
            });
          }
        }
      }
    }, [editor, initialContent]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    return (
      <EditorContent editor={editor} className="tiptap-root" role="textbox" />
    );
  },
);

ChatEditor.displayName = "ChatEditor";

export default ChatEditor;
