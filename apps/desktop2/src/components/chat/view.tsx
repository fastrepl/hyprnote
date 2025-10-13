import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import * as internal from "../../store/tinybase/internal";
import type { ChatMessage, ChatMessageStorage } from "../../store/tinybase/persisted";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";

export function ChatView({
  chatGroupId,
  setChatGroupId,
  onChatGroupChange,
  onClose,
}: {
  chatGroupId?: string;
  setChatGroupId: (chatGroupId: string | undefined) => void;
  onChatGroupChange?: (chatGroupId: string | undefined) => void;
  onClose?: () => void;
}) {
  const [sessionKey, setSessionKey] = useState(() => chatGroupId || id());
  const chatGroupIdRef = useRef<string | undefined>(chatGroupId);

  useEffect(() => {
    chatGroupIdRef.current = chatGroupId;
  }, [chatGroupId]);

  const { user_id } = internal.UI.useValues(internal.STORE_ID);

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

  const handleSendMessage = useCallback(
    (content: string, parts: any[], sendMessage: (message: UIMessage) => void) => {
      let groupId = chatGroupIdRef.current;

      const messageId = id();
      const uiMessage: UIMessage = { id: messageId, role: "user", parts, metadata: {} };

      if (!groupId) {
        groupId = id();
        chatGroupIdRef.current = groupId;
        createChatGroup({ groupId, title: content.slice(0, 50) + (content.length > 50 ? "..." : "") });
        setChatGroupId(groupId);
        onChatGroupChange?.(groupId);
      }

      createChatMessage({ id: messageId, chat_group_id: groupId, content, role: "user", parts, metadata: {} });
      sendMessage(uiMessage);
    },
    [createChatGroup, createChatMessage, setChatGroupId, onChatGroupChange],
  );

  const handleNewChat = useCallback(() => {
    chatGroupIdRef.current = undefined;
    setChatGroupId(undefined);
    setSessionKey(id());
    onChatGroupChange?.(undefined);
  }, [onChatGroupChange]);

  const handleSelectChat = useCallback(
    (chatGroupId: string) => {
      chatGroupIdRef.current = chatGroupId;
      setChatGroupId(chatGroupId);
      setSessionKey(chatGroupId);
      onChatGroupChange?.(chatGroupId);
    },
    [onChatGroupChange],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        currentChatGroupId={chatGroupId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        handleClose={onClose || (() => {})}
      />
      <ChatSession
        key={sessionKey}
        sessionId={sessionKey}
        chatGroupId={chatGroupId}
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
