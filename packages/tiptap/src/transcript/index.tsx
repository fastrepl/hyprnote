import "../styles/transcript.css";

import { SearchAndReplace } from "@sereneinserenade/tiptap-search-and-replace";
import { type Editor as TiptapEditor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect, useRef } from "react";

import { SpeakerSplit } from "./extensions";
import { SpeakerNode } from "./nodes";
import { fromEditorToWords, fromWordsToEditor, getSpeakerLabel, type SpeakerAttributes, type Word } from "./utils";
import type { SpeakerChangeRange, SpeakerViewInnerComponent, SpeakerViewInnerProps } from "./views";

export { SpeakerChangeRange, SpeakerViewInnerProps };

interface TranscriptEditorProps {
  editable?: boolean;
  initialWords: Word[] | null;
  onUpdate?: (words: Word[]) => void;
  c: SpeakerViewInnerComponent;
}

export interface TranscriptEditorRef {
  editor: TiptapEditor | null;
  getWords: () => Word[] | null;
  setWords: (words: Word[]) => void;
  scrollToBottom: () => void;
  appendWords: (newWords: Word[]) => void;
  toText: () => string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (s: string) => ReturnType;
      setReplaceTerm: (s: string) => ReturnType;
      replaceAll: () => ReturnType;
    };
  }
}

const TranscriptEditor = forwardRef<TranscriptEditorRef, TranscriptEditorProps>(
  ({ editable = true, c, onUpdate, initialWords }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const extensions = [
      Document.configure({ content: "speaker+" }),
      History,
      Text,
      SpeakerNode(c),
      SpeakerSplit,
      SearchAndReplace.configure({
        searchResultClass: "search-result",
        disableRegex: true,
      }),
      BubbleMenu,
    ];

    const editor = useEditor({
      extensions,
      editable,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      onUpdate: ({ editor }) => {
        if (onUpdate) {
          onUpdate(fromEditorToWords(editor.getJSON() as any));
        }
      },
      content: initialWords ? fromWordsToEditor(initialWords) : undefined,
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
          scrollToBottom: () => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
          },
          appendWords: (newWords: Word[]) => {
            if (!editor || !newWords.length) {
              return;
            }

            const jsonFragment = fromWordsToEditor(newWords).content;

            if (!jsonFragment?.length) {
              return;
            }

            const endPos = editor.state.doc.content.size;

            editor
              .chain()
              .insertContentAt(endPos, jsonFragment)
              .run();
          },
          toText: () => {
            if (!editor) {
              return "";
            }

            const doc = editor.getJSON();
            if (!doc?.content) {
              return "";
            }

            const lines: string[] = [];

            for (const speakerBlock of doc.content) {
              if (speakerBlock.type !== "speaker" || !speakerBlock.content) {
                continue;
              }

              const attrs = speakerBlock.attrs as SpeakerAttributes || {};
              const speakerLabel = getSpeakerLabel(attrs);

              const textContent = speakerBlock.content
                .filter((node: any) => node.type === "text")
                .map((node: any) => node.text || "")
                .join("")
                .trim();

              if (textContent) {
                lines.push(`[${speakerLabel}]\n${textContent}`);
              }
            }

            return lines.join("\n\n");
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
      <div role="textbox" className="h-full flex-1 flex flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 pb-8"
        >
          <EditorContent editor={editor} className="min-h-full pb-4" />
        </div>
      </div>
    );
  },
);

TranscriptEditor.displayName = "TranscriptEditor";

export default TranscriptEditor;
