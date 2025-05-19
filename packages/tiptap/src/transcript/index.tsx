import "../styles/transcript.css";

import { SearchAndReplace } from "@sereneinserenade/tiptap-search-and-replace";
import { type Editor as TiptapEditor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useEffect } from "react";

import { SpeakerSplit, WordSplit } from "./extensions";
import { createSpeakerNode, type Speaker, WordNode } from "./nodes";
import { fromEditorToWords, fromWordsToEditor, type Word } from "./utils";

interface TranscriptEditorProps {
  editable?: boolean;
  initialWords?: Word[];
  speakers: Speaker[];
}

const TranscriptEditor = forwardRef<
  { editor: TiptapEditor | null; getWords: () => Word[] | null },
  TranscriptEditorProps
>(
  ({ initialWords, editable = true, speakers }, ref) => {
    const extensions = [
      Document.configure({ content: "speaker+" }),
      History,
      Text,
      WordNode,
      createSpeakerNode(speakers),
      WordSplit,
      SpeakerSplit,
      SearchAndReplace.configure({
        searchResultClass: "search-result",
        disableRegex: false,
      }),
    ];

    const editor = useEditor({
      extensions,
      editable,
      editorProps: {
        attributes: {
          class: "tiptap-transcript",
        },
      },
    });

    useEffect(() => {
      if (ref && typeof ref === "object") {
        (ref as any).current = {
          editor,
          getWords: () => {
            if (!editor) {
              return null;
            }
            // @ts-expect-error: tiptap types
            return fromEditorToWords(editor.getJSON());
          },
        };
      }
    }, [editor]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    useEffect(() => {
      if (editor) {
        editor.commands.setContent(fromWordsToEditor(initialWords ?? []));
      }
    }, [editor, initialWords]);

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
