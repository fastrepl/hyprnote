import "../styles/transcript.css";

import { SearchAndReplace } from "@sereneinserenade/tiptap-search-and-replace";
import { type Editor as TiptapEditor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { SpeakerSplit, WordSplit } from "./extensions";
import { SpeakerNode, WordNode } from "./nodes";
import { fromEditorToWords, fromWordsToEditor, type Word } from "./utils";
import type { SpeakerViewInnerComponent, SpeakerViewInnerProps } from "./views";

export { SpeakerViewInnerProps };

interface TranscriptEditorProps {
  editable?: boolean;
  onBlur?: (words: Word[]) => void;
  c: SpeakerViewInnerComponent;
}

export interface TranscriptEditorRef {
  editor: TiptapEditor | null;
  getWords: () => Word[] | null;
  setWords: (words: Word[]) => void;
}

const TranscriptEditor = forwardRef<TranscriptEditorRef, TranscriptEditorProps>(
  ({ editable = true, c, onBlur }, ref) => {
    const extensions = [
      Document.configure({ content: "speaker+" }),
      History,
      Text,
      WordNode,
      SpeakerNode(c),
      WordSplit,
      SpeakerSplit,
      SearchAndReplace.configure({
        searchResultClass: "search-result",
        disableRegex: false,
      }),
      BubbleMenu,
    ];

    const editor = useEditor({
      extensions,
      editable,
      onBlur: ({ editor }) => {
        if (onBlur) {
          onBlur(fromEditorToWords(editor.getJSON() as any));
        }
      },
      editorProps: {
        attributes: {
          class: "tiptap-transcript",
        },
      },
    });

    useEffect(() => {
      if (ref && typeof ref === "object" && editor) {
        ref.current = {
          editor,
          setWords: (words: Word[]) => {
            if (!editor) {
              return;
            }

            const content = fromWordsToEditor(words);
            editor.commands.setContent(content);
          },
          getWords: () => {
            if (!editor) {
              return null;
            }
            return fromEditorToWords(editor.getJSON() as any);
          },
        };
      }
    }, [editor]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    return (
      <div role="textbox" className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    );
  },
);

TranscriptEditor.displayName = "TranscriptEditor";

export default TranscriptEditor;
