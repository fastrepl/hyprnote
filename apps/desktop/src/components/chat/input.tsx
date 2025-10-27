import Editor from "@hypr/tiptap/editor";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { SendIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

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

  useEffect(() => {
    editorRef.current?.editor?.commands.focus();
  }, []);

  return (
    <div
      className={cn([chat.mode !== "RightPanelOpen" && "p-1"])}
    >
      <div
        className={cn([
          "flex flex-col border border-neutral-200 rounded-xl",
          chat.mode === "RightPanelOpen" && "rounded-t-none border-t-0",
        ])}
      >
        <div className="flex-1 p-2">
          <Editor
            ref={editorRef}
            placeholderComponent={() => <p className="text-sm text-neutral-400">Ask me anything...</p>}
            handleChange={() => {}}
            initialContent=""
            editable={!disabled}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => [{ id: "123", type: "human", label: "John Doe" }],
            }}
          />
        </div>

        <div className="flex items-center justify-between px-2 pb-2 -mt-4">
          <div className="flex items-center gap-1">
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(disabled && "text-neutral-400")}
            >
              <SendIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
