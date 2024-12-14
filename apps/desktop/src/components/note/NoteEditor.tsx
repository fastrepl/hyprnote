import "../../styles/editor.css";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { useEffect } from "react";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function NoteEditor({ content, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Highlight, Typography],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
      handleDOMEvents: {
        keydown: (_, event) => {
          if (event.key === "Tab") {
            return true;
          }
          return false;
        },
      },
      transformPastedText: (text) => text,
      transformPastedHTML: (html) => html,
    },
    enableInputRules: false,
    enablePasteRules: false,
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="absolute inset-y-4 left-6 right-0 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="h-full w-full"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (!editor) return;

            // 클릭한 위치의 Y 좌표
            const clickY = e.clientY;
            // 에디터의 마지막 위치의 Y 좌표
            const editorRect = editor.view.dom.getBoundingClientRect();
            const lastLineY = editorRect.bottom;

            // 클릭 위치가 마지막 줄보다 아래인 경우
            if (clickY > lastLineY) {
              // 마지막 위치로 커서 이동
              editor.commands.setTextSelection(editor.state.doc.content.size);

              // 마지막 노드가 빈 텍스트 블록이 아닌 경우에만 새 줄 추가
              const lastNode = editor.state.doc.lastChild;
              if (
                lastNode &&
                (!lastNode.isTextblock || lastNode.content.size > 0)
              ) {
                editor.commands.enter();
              }
            }

            editor.commands.focus();
          }}
        />
      </div>
    </div>
  );
}
