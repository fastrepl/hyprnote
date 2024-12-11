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
        keydown: (view, event) => {
          // Tab 키 이벤트 방지
          if (event.key === "Tab") {
            return true;
          }
          return false;
        },
      },
      // 자동 수정 비활성화
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
    <div
      className="h-full w-full p-4 px-6"
      onClick={(e) => {
        if (!editor) return;

        // 클릭한 위치의 Y 좌표
        const clickY = e.clientY;
        // 에디터의 마지막 위치의 Y 좌표
        const editorRect = editor.view.dom.getBoundingClientRect();
        const lastLineY = editorRect.bottom;

        // 클릭 위치가 마지막 줄보다 아래인 경우 새로운 줄 추가
        if (clickY > lastLineY) {
          editor.commands.setTextSelection(editor.state.doc.content.size);
          editor.commands.enter();
        }

        editor.commands.focus();
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
