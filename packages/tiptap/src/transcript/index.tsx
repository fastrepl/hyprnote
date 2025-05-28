import "../styles/transcript.css";

import { SearchAndReplace } from "@sereneinserenade/tiptap-search-and-replace";
import { type Editor as TiptapEditor } from "@tiptap/core";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { PerformanceOptimizer, SpeakerSplit, WordSplit } from "./extensions";
import { SpeakerNode, WordNode } from "./nodes";
import { fromEditorToWords, fromWordsToEditor, type Word } from "./utils";
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
}

const TranscriptEditor = forwardRef<TranscriptEditorRef, TranscriptEditorProps>(
  ({ editable = true, c, onUpdate, initialWords }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout>();
    const lastWordCountRef = useRef<number>(0);

    const extensions = useMemo(() => [
      Document.configure({ content: "speaker+" }),
      History,
      Text,
      WordNode,
      SpeakerNode(c),
      WordSplit,
      SpeakerSplit,
      PerformanceOptimizer,
      SearchAndReplace.configure({
        searchResultClass: "search-result",
        disableRegex: true,
      }),
      BubbleMenu,
    ], [c]);

    const handleUpdate = useCallback(({ editor }: { editor: TiptapEditor }) => {
      if (!onUpdate) {
        return;
      }

      // Debounce updates to avoid excessive re-computation
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        const words = fromEditorToWords(editor.getJSON() as any);
        onUpdate(words);
      }, 300);
    }, [onUpdate]);

    const editor = useEditor({
      extensions,
      editable,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      onUpdate: handleUpdate,
      content: initialWords ? fromWordsToEditor(initialWords) : undefined,
      editorProps: {
        attributes: {
          class: "tiptap-transcript",
        },
      },
    });

    // Optimize word updates for live mode
    const setWords = useCallback((words: Word[]) => {
      if (!editor) {
        return;
      }

      const currentWordCount = words.length;
      const prevWordCount = lastWordCountRef.current;

      // If we're just appending new words (common in live mode)
      if (currentWordCount > prevWordCount && prevWordCount > 0) {
        // Only update if there are actually new words
        const newWords = words.slice(prevWordCount);
        if (newWords.length > 0) {
          const content = fromWordsToEditor(newWords);

          // Append only the new content
          const { state } = editor;
          const { tr } = state;

          // Insert at the end of the document
          const endPos = state.doc.content.size;
          content.content.forEach((node: any) => {
            const proseMirrorNode = editor.schema.nodeFromJSON(node);
            tr.insert(endPos, proseMirrorNode);
          });

          editor.view.dispatch(tr);
        }
      } else {
        // Full replacement (initial load or major change)
        const content = fromWordsToEditor(words);
        editor.commands.setContent(content);
      }

      lastWordCountRef.current = currentWordCount;
    }, [editor]);

    const getWords = useCallback(() => {
      if (!editor) {
        return null;
      }
      return fromEditorToWords(editor.getJSON() as any);
    }, [editor]);

    const scrollToBottom = useCallback(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      editor,
      setWords,
      getWords,
      scrollToBottom,
    }), [editor, setWords, getWords, scrollToBottom]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div role="textbox" className="h-full flex flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    );
  },
);

TranscriptEditor.displayName = "TranscriptEditor";

export default TranscriptEditor;
