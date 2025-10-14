import { MicIcon, PaperclipIcon, SendIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import Editor from "@hypr/tiptap/editor";
import { cn } from "@hypr/ui/lib/utils";
import { useShell } from "../../contexts/shell";

function tiptapJsonToText(json: any): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  if (json.type === "text") {
    return json.text || "";
  }

  if (json.type === "mention") {
    return `@${json.attrs?.label || json.attrs?.id || ""}`;
  }

  if (json.content && Array.isArray(json.content)) {
    return json.content.map(tiptapJsonToText).join("");
  }

  return "";
}

export function ChatMessageInput({
  onSendMessage,
  disabled,
}: {
  onSendMessage: (content: string, parts: any[]) => void;
  disabled?: boolean;
}) {
  const editorRef = useRef<{ editor: any }>(null);
  const { chat } = useShell();

  const handleSubmit = useCallback(() => {
    const json = editorRef.current?.editor?.getJSON();
    const text = tiptapJsonToText(json).trim();

    if (!text || disabled) {
      return;
    }

    onSendMessage(text, [{ type: "text", text }]);
    editorRef.current?.editor?.commands.clearContent();
  }, [disabled, onSendMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }
    };

    const editorEl = editorRef.current?.editor?.view?.dom;
    if (editorEl) {
      editorEl.addEventListener("keydown", handleKeyDown, true);
      return () => editorEl.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [handleSubmit]);

  return (
    <div
      className={cn([chat.mode !== "RightPanelOpen" && "p-0.5"])}
    >
      <div
        className={cn([
          "flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-md",
          "focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500",
          chat.mode === "RightPanelOpen" && "rounded-t-none border-t-0",
        ])}
      >
        <button className={cn(["text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"])}>
          <PaperclipIcon className="size-4" />
        </button>

        <div className={cn(["flex-1 min-w-0"])}>
          <Editor
            ref={editorRef}
            handleChange={() => {}}
            initialContent=""
            editable={!disabled}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => [{ id: "123", type: "human", label: "John Doe" }],
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
