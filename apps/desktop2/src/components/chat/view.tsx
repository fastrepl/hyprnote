import type { UIMessage } from "ai";
import { useCallback } from "react";

import { useShell } from "../../contexts/shell";
import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";

export function ChatView() {
  const { chat } = useShell();
  const { groupId, setGroupId } = chat;

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
    (p: { id: string; chat_group_id: string; content: string; role: string; parts: any; metadata: any }) => p.id,
    (p: { id: string; chat_group_id: string; content: string; role: string; parts: any; metadata: any }) => ({
      user_id,
      chat_group_id: p.chat_group_id,
      content: p.content,
      created_at: new Date().toISOString(),
      role: p.role,
      metadata: JSON.stringify(p.metadata),
      parts: JSON.stringify(p.parts),
    }),
    [user_id],
    persisted.STORE_ID,
  );

  const handleSendMessage = useCallback(
    (content: string, parts: any[], sendMessage: (message: UIMessage) => void) => {
      const messageId = id();
      const uiMessage: UIMessage = { id: messageId, role: "user", parts, metadata: {} };

      let currentGroupId = groupId;
      if (!currentGroupId) {
        currentGroupId = id();
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        createChatGroup({ groupId: currentGroupId, title });
        setGroupId(currentGroupId);
      }

      createChatMessage({
        id: messageId,
        chat_group_id: currentGroupId,
        content,
        role: "user",
        parts,
        metadata: {},
      });

      sendMessage(uiMessage);
    },
    [groupId, createChatGroup, createChatMessage, setGroupId],
  );

  const handleNewChat = useCallback(() => {
    setGroupId(undefined);
  }, [setGroupId]);

  const handleSelectChat = useCallback(
    (selectedGroupId: string) => {
      setGroupId(selectedGroupId);
    },
    [setGroupId],
  );

  const sessionKey = groupId ?? "new-chat";

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        currentChatGroupId={groupId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        handleClose={() => chat.sendEvent({ type: "CLOSE" })}
      />
      <ChatSession key={sessionKey} sessionId={sessionKey} chatGroupId={groupId}>
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
