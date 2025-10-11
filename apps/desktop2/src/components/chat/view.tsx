import type { UIMessage } from "ai";
import { useCallback, useState } from "react";

import type { ChatMessage, ChatMessageStorage } from "../../store/tinybase/persisted";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

import clsx from "clsx";
import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";

export function ChatView({
  initialChatGroupId,
  onChatGroupChange,
  onClose,
  isWindow = false,
}: {
  initialChatGroupId?: string;
  onChatGroupChange?: (chatGroupId: string | undefined) => void;
  onClose?: () => void;
  isWindow?: boolean;
}) {
  const [currentChatGroupId, setCurrentChatGroupId] = useState<string | undefined>(initialChatGroupId);
  const [sessionKey, setSessionKey] = useState(() => initialChatGroupId || id());

  const { user_id } = persisted.useConfig();

  const createChatGroup = persisted.UI.useSetRowCallback(
    "chat_groups",
    (p: { groupId: string; title: string }) => p.groupId,
    (p: { groupId: string; title: string }) => ({
      user_id,
      created_at: new Date().toISOString(),
      title: p.title,
    }),
    [user_id],
    persisted.STORE_ID,
  );

  const createChatMessage = persisted.UI.useSetRowCallback(
    "chat_messages",
    (p: Omit<ChatMessage, "user_id" | "created_at"> & { id: string }) => p.id,
    (p: Omit<ChatMessage, "user_id" | "created_at"> & { id: string }) => ({
      user_id,
      chat_group_id: p.chat_group_id,
      content: p.content,
      created_at: new Date().toISOString(),
      role: p.role,
      metadata: JSON.stringify(p.metadata),
      parts: JSON.stringify(p.parts),
    } satisfies ChatMessageStorage),
    [user_id],
    persisted.STORE_ID,
  );

  const handleFinish = useCallback(
    (message: UIMessage) => {
      if (!currentChatGroupId) {
        return;
      }

      const content = message.parts
        .filter((p) => p.type === "text")
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("");

      createChatMessage({
        id: message.id,
        chat_group_id: currentChatGroupId,
        content,
        role: "assistant",
        parts: message.parts,
        metadata: message.metadata,
      });
    },
    [currentChatGroupId, createChatMessage],
  );

  const handleSendMessage = useCallback(
    (content: string, parts: any[], sendMessage: (message: UIMessage) => void) => {
      let groupId = currentChatGroupId;

      const messageId = id();
      const uiMessage: UIMessage = { id: messageId, role: "user", parts, metadata: {} };

      if (!groupId) {
        groupId = id();
        createChatGroup({ groupId, title: content.slice(0, 50) + (content.length > 50 ? "..." : "") });
        setCurrentChatGroupId(groupId);
        onChatGroupChange?.(groupId);
      }

      createChatMessage({ id: messageId, chat_group_id: groupId, content, role: "user", parts, metadata: {} });
      sendMessage(uiMessage);
    },
    [currentChatGroupId, createChatGroup, createChatMessage, onChatGroupChange],
  );

  const handleNewChat = useCallback(() => {
    setCurrentChatGroupId(undefined);
    setSessionKey(id());
    onChatGroupChange?.(undefined);
  }, [onChatGroupChange]);

  const handleSelectChat = useCallback(
    (chatGroupId: string) => {
      setCurrentChatGroupId(chatGroupId);
      setSessionKey(chatGroupId);
      onChatGroupChange?.(chatGroupId);
    },
    [onChatGroupChange],
  );

  return (
    <div className="flex flex-col h-full" data-tauri-drag-region>
      <div className={clsx(!isWindow && "cursor-move select-none")}>
        <ChatHeader
          currentChatGroupId={currentChatGroupId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          handleClose={onClose || (() => {})}
          isWindow={isWindow}
        />
      </div>
      <ChatSession
        key={sessionKey}
        sessionId={sessionKey}
        chatGroupId={currentChatGroupId}
        onFinish={handleFinish}
      >
        {({ messages, sendMessage, status, error }) => (
          <>
            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <p className="text-xs text-red-600">{error.message}</p>
              </div>
            )}
            <ChatBody messages={messages} />
            <ChatMessageInput
              onSendMessage={(content, parts) => handleSendMessage(content, parts, sendMessage)}
              disabled={status !== "ready"}
            />
          </>
        )}
      </ChatSession>
    </div>
  );
}
