import type { UIMessage } from "ai";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/ui/lib/utils";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";
import { ChatTrigger } from "./trigger";

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentChatGroupId, setCurrentChatGroupId] = useState<string | undefined>(undefined);
  const [sessionKey, setSessionKey] = useState(() => id());
  const [queuedMessage, setQueuedMessage] = useState<UIMessage | null>(null);
  const chatRef = useAutoCloser(() => setIsOpen(false), isOpen);

  useHotkeys("meta+j", () => setIsOpen((prev) => !prev));

  const { user_id } = persisted.useConfig();

  const createGroup = persisted.UI.useSetRowCallback(
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

  const createMessage = persisted.UI.useSetRowCallback(
    "chat_messages",
    (p: { messageId: string; groupId: string; content: string; role: string; parts: any[] }) => p.messageId,
    (p: { messageId: string; groupId: string; content: string; role: string; parts: any[] }) => ({
      user_id,
      chat_group_id: p.groupId,
      content: p.content,
      created_at: new Date().toISOString(),
      role: p.role,
      metadata: JSON.stringify({}),
      parts: JSON.stringify(p.parts),
    }),
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

      createMessage({
        messageId: message.id,
        groupId: currentChatGroupId,
        content,
        role: "assistant",
        parts: message.parts,
      });
    },
    [currentChatGroupId, createMessage],
  );

  const handleSendMessage = useCallback(
    (content: string, parts: any[], sendMessage: (message: UIMessage) => void) => {
      let groupId = currentChatGroupId;

      const messageId = id();
      const uiMessage: UIMessage = { id: messageId, role: "user", parts, metadata: {} };

      if (!groupId) {
        groupId = id();
        createGroup({ groupId, title: content.slice(0, 50) + (content.length > 50 ? "..." : "") });
        setCurrentChatGroupId(groupId);
        setQueuedMessage(uiMessage);
      } else {
        sendMessage(uiMessage);
      }

      createMessage({ messageId, groupId, content, role: "user", parts });
    },
    [currentChatGroupId, createGroup, createMessage],
  );

  const handleNewChat = useCallback(() => {
    setCurrentChatGroupId(undefined);
    setSessionKey(id());
    setQueuedMessage(null);
  }, []);

  return (
    <>
      {isOpen
        ? (
          <div
            ref={chatRef}
            className={cn(
              "fixed bottom-4 right-4 z-40",
              "w-[440px] h-[600px] max-h-[calc(100vh-120px)]",
              "bg-white rounded-2xl shadow-2xl",
              "border border-neutral-200",
              "flex flex-col",
              "animate-in slide-in-from-bottom-4 fade-in duration-200",
            )}
          >
            <ChatHeader
              currentChatGroupId={currentChatGroupId}
              onNewChat={handleNewChat}
              onSelectChat={(id) => {
                setCurrentChatGroupId(id);
                setSessionKey(id);
                setQueuedMessage(null);
              }}
              handleClose={() => setIsOpen(false)}
            />
            <ChatSession
              key={sessionKey}
              chatGroupId={currentChatGroupId}
              onFinish={handleFinish}
              queuedMessage={queuedMessage}
              onConsumeQueuedMessage={() => setQueuedMessage(null)}
            >
              {({ messages, sendMessage, status, error }) => (
                <>
                  {error && (
                    <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                      <p className="text-xs text-red-600">Error: {error.message}</p>
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
        )
        : <ChatTrigger onClick={() => setIsOpen(true)} />}
    </>
  );
}
