import type { TiptapEditor } from "@hypr/tiptap/editor";
import Editor from "@hypr/tiptap/editor";
import type { PlaceholderFunction } from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { FullscreenIcon, MicIcon, PaperclipIcon, SendIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { useShell } from "../../contexts/shell";

export function ChatMessageInput({
  onSendMessage,
  disabled: disabledProp,
}: {
  onSendMessage: (content: string, parts: any[]) => void;
  disabled?: boolean | { disabled: boolean; message?: string };
}) {
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);

  const disabled = typeof disabledProp === "object" ? disabledProp.disabled : disabledProp;

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
    const editor = editorRef.current?.editor;
    if (!editor || editor.isDestroyed || !editor.isInitialized) {
      return;
    }

    if (!disabled) {
      editor.commands.focus();
    }
  }, [disabled]);

  const handleAttachFile = useCallback(() => {
    // TODO: Implement file attachment
    console.log("Attach file clicked");
  }, []);

  const handleTakeScreenshot = useCallback(() => {
    // TODO: Implement screenshot
    console.log("Take screenshot clicked");
  }, []);

  const handleVoiceInput = useCallback(() => {
    // TODO: Implement voice input
    console.log("Voice input clicked");
  }, []);

  return (
    <Container>
      <div className="flex flex-col p-2">
        <div className="flex-1 mb-2">
          <Editor
            ref={editorRef}
            editable={!disabled}
            initialContent=""
            placeholderComponent={ChatPlaceholder}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => [{ id: "123", type: "human", label: "John Doe" }],
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              onClick={handleAttachFile}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn([
                "h-8 w-8",
                disabled && "text-neutral-400",
              ])}
            >
              <PaperclipIcon size={16} />
            </Button>
            <Button
              onClick={handleTakeScreenshot}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn([
                "h-8 w-8",
                disabled && "text-neutral-400",
              ])}
            >
              <FullscreenIcon size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              onClick={handleVoiceInput}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn([
                "h-8 w-8",
                disabled && "text-neutral-400",
              ])}
            >
              <MicIcon size={16} />
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn([
                "h-8 w-8",
                disabled && "text-neutral-400",
              ])}
            >
              <SendIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
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

const ChatPlaceholder: PlaceholderFunction = ({ node, pos }) => {
  if (node.type.name === "paragraph" && pos === 0) {
    return <p className="text-sm text-neutral-400">Ask & search about anything, or be creative!</p>;
  }
  return "";
};

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
