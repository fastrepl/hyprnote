import { MicIcon, PaperclipIcon, SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Editor from "@hypr/tiptap/editor";
import { cn } from "@hypr/ui/lib/utils";

export function ChatMessageInput({
  onSendMessage,
  disabled,
}: {
  onSendMessage: (content: string, parts: any[]) => void;
  disabled?: boolean;
}) {
  const [content, setContent] = useState("");
  const editorRef = useRef<{ editor: any }>(null);

  const handleSubmit = () => {
    const text = editorRef.current?.editor?.getText().trim();
    if (!text || disabled) {
      return;
    }

    onSendMessage(text, [{ type: "text", text }]);
    editorRef.current?.editor?.commands.clearContent();
    setContent("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    const editorEl = editorRef.current?.editor?.view?.dom;
    if (editorEl) {
      editorEl.addEventListener("keydown", handleKeyDown);
      return () => editorEl.removeEventListener("keydown", handleKeyDown);
    }
  }, [content, disabled]);

  return (
    <div
      className={cn([
        "px-3 py-2 border-t border-neutral-200",
      ])}
    >
      <div
        className={cn([
          "flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-xl",
          "focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500",
        ])}
      >
        <button className={cn(["text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"])}>
          <PaperclipIcon className="size-4" />
        </button>

        <div className={cn(["flex-1 min-w-0"])}>
          <Editor
            ref={editorRef}
            handleChange={setContent}
            initialContent=""
            editable={!disabled}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => [],
            }}
          />
        </div>

        <button className={cn(["text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"])}>
          <MicIcon className="size-4" />
        </button>

        <button
          onClick={handleSubmit}
          disabled={disabled}
          className={cn([
            "p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors shrink-0",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ])}
        >
          <SendIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
