import { SendIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import Editor from "@hypr/tiptap/editor";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useShell } from "../../contexts/shell";

export function ChatMessageInput({
  onSendMessage,
  disabled: disabledProp,
}: {
  onSendMessage: (content: string, parts: any[]) => void;
  disabled?: boolean | { disabled: boolean; message?: string };
}) {
  const editorRef = useRef<{ editor: any }>(null);

  const disabled = typeof disabledProp === "object" ? disabledProp.disabled : disabledProp;
  const disabledMessage = typeof disabledProp === "object" ? disabledProp.message : undefined;

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

  if (disabled && disabledMessage) {
    return (
      <Container>
        <div className="h-[80px] flex items-center justify-center">
          <p className="text-neutral-400 font-semibold">{disabledMessage}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex-1 p-2">
        <Editor
          ref={editorRef}
          editable={!disabled}
          placeholderComponent={() => <p className="text-sm text-neutral-400">Ask me anything...</p>}
          mentionConfig={{
            trigger: "@",
            handleSearch: async () => [{ id: "123", type: "human", label: "John Doe" }],
          }}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={disabled}
        size="icon"
        variant="ghost"
        className={cn([
          "m-1",
          disabled && "text-neutral-400",
        ])}
      >
        <SendIcon size={16} />
      </Button>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  const { chat } = useShell();

  return (
    <div className={cn([chat.mode !== "RightPanelOpen" && "p-1"])}>
      <div
        className={cn([
          "flex flex-col border border-neutral-200 rounded-xl",
          chat.mode === "RightPanelOpen" && "rounded-t-none border-t-0",
        ])}
      >
        {children}
      </div>
    </div>
  );
}

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
