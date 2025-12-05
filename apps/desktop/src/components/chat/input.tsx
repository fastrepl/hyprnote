import { FullscreenIcon, MicIcon, PaperclipIcon, SendIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import type { SlashCommandConfig, TiptapEditor } from "@hypr/tiptap/chat";
import ChatEditor from "@hypr/tiptap/chat";
import {
  EMPTY_TIPTAP_DOC,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useShell } from "../../contexts/shell";
import * as main from "../../store/tinybase/main";

export function ChatMessageInput({
  onSendMessage,
  disabled: disabledProp,
  attachedSession,
}: {
  onSendMessage: (content: string, parts: any[]) => void;
  disabled?: boolean | { disabled: boolean; message?: string };
  attachedSession?: { id: string; title?: string };
}) {
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const chatShortcuts = main.UI.useResultTable(
    main.QUERIES.visibleChatShortcuts,
    main.STORE_ID,
  );
  const sessions = main.UI.useResultTable(
    main.QUERIES.sessionsWithMaybeEvent,
    main.STORE_ID,
  );

  const disabled =
    typeof disabledProp === "object" ? disabledProp.disabled : disabledProp;

  const handleSubmit = useCallback(() => {
    const json = editorRef.current?.editor?.getJSON();
    const text = tiptapJsonToText(json).trim();

    if (!text || disabled) {
      return;
    }

    analyticsCommands.event({ event: "chat_message_sent" });
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
    console.log("Attach file clicked");
  }, []);

  const handleTakeScreenshot = useCallback(() => {
    console.log("Take screenshot clicked");
  }, []);

  const handleVoiceInput = useCallback(() => {
    console.log("Voice input clicked");
  }, []);

  const slashCommandConfig: SlashCommandConfig = useMemo(
    () => ({
      handleSearch: async (query: string) => {
        const results: {
          id: string;
          type: string;
          label: string;
          content?: string;
        }[] = [];
        const lowerQuery = query.toLowerCase();

        Object.entries(chatShortcuts).forEach(([rowId, row]) => {
          const content = row.content as string | undefined;
          if (content && content.toLowerCase().includes(lowerQuery)) {
            const label =
              content.length > 40 ? content.slice(0, 40) + "..." : content;
            results.push({
              id: rowId,
              type: "chat_shortcut",
              label,
              content,
            });
          }
        });

        Object.entries(sessions).forEach(([rowId, row]) => {
          const title = row.title as string | undefined;
          if (title && title.toLowerCase().includes(lowerQuery)) {
            results.push({ id: rowId, type: "session", label: title });
          }
        });

        return results.slice(0, 5);
      },
    }),
    [chatShortcuts, sessions],
  );

  return (
    <Container>
      {attachedSession && (
        <div className="px-3 pt-2 text-xs text-neutral-500 truncate">
          Attached: {attachedSession.title || "Untitled"}
        </div>
      )}
      <div className="flex flex-col p-2">
        <div className="flex-1 mb-2">
          <ChatEditor
            ref={editorRef}
            editable={!disabled}
            initialContent={EMPTY_TIPTAP_DOC}
            placeholderComponent={ChatPlaceholder}
            slashCommandConfig={slashCommandConfig}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              onClick={handleAttachFile}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <PaperclipIcon size={16} />
            </Button>
            <Button
              onClick={handleTakeScreenshot}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
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
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <MicIcon size={16} />
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
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
    return (
      <p className="text-sm text-neutral-400">
        Ask & search about anything, or be creative!
      </p>
    );
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
