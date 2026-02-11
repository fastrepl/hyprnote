import { SendIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import type {
  JSONContent,
  SlashCommandConfig,
  TiptapEditor,
} from "@hypr/tiptap/chat";
import ChatEditor from "@hypr/tiptap/chat";
import {
  EMPTY_TIPTAP_DOC,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { useShell } from "../../contexts/shell";
import * as main from "../../store/tinybase/store/main";

let _draft: JSONContent | undefined;

export function ChatMessageInput({
  onSendMessage,
  disabled: disabledProp,
  attachedSession,
  isStreaming,
  onStop,
}: {
  onSendMessage: (
    content: string,
    parts: Array<{ type: "text"; text: string }>,
  ) => void;
  disabled?: boolean | { disabled: boolean; message?: string };
  attachedSession?: { id: string; title?: string };
  isStreaming?: boolean;
  onStop?: () => void;
}) {
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const [hasContent, setHasContent] = useState(false);
  const initialContent = useRef(_draft ?? EMPTY_TIPTAP_DOC);
  const chatShortcuts = main.UI.useResultTable(
    main.QUERIES.visibleChatShortcuts,
    main.STORE_ID,
  );
  const sessions = main.UI.useResultTable(
    main.QUERIES.timelineSessions,
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

    void analyticsCommands.event({ event: "message_sent" });
    onSendMessage(text, [{ type: "text", text }]);
    editorRef.current?.editor?.commands.clearContent();
    _draft = undefined;
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

  const handleEditorUpdate = useCallback((json: JSONContent) => {
    const text = tiptapJsonToText(json).trim();
    setHasContent(text.length > 0);
    _draft = json;
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
          const title = row.title as string | undefined;
          const content = row.content as string | undefined;
          if (title && content && title.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: rowId,
              type: "chat_shortcut",
              label: title,
              content,
            });
          }
        });

        Object.entries(sessions).forEach(([rowId, row]) => {
          const title = row.title as string | undefined;
          if (title && title.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: rowId,
              type: "session",
              label: title,
            });
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
            initialContent={initialContent.current}
            placeholderComponent={ChatPlaceholder}
            slashCommandConfig={slashCommandConfig}
            onUpdate={handleEditorUpdate}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="flex items-center justify-end">
          {isStreaming ? (
            <Button
              onClick={onStop}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <SquareIcon size={16} className="fill-current" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <SendIcon size={16} />
            </Button>
          )}
        </div>
      </div>
      {hasContent && (
        <span className="absolute bottom-1.5 right-5 text-[8px] text-neutral-400">
          Enter to send, Shift + Enter for new line
        </span>
      )}
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  const { chat } = useShell();

  return (
    <div
      className={cn([
        "relative",
        chat.mode !== "RightPanelOpen" && "px-1 pb-1",
      ])}
    >
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
  "use no memo";
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
