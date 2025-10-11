import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/ui/lib/utils";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatTrigger } from "./trigger";

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentChatGroupId, setCurrentChatGroupId] = useState<string | undefined>(undefined);
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
    (p: { messageId: string; groupId: string; content: string; parts: any[] }) => p.messageId,
    (p: { messageId: string; groupId: string; content: string; parts: any[] }) => ({
      user_id,
      chat_group_id: p.groupId,
      content: p.content,
      created_at: new Date().toISOString(),
      role: "user",
      metadata: JSON.stringify({}),
      parts: JSON.stringify(p.parts),
    }),
    [user_id],
    persisted.STORE_ID,
  );

  const handleSendMessage = useCallback(
    (content: string, parts: any[]) => {
      let groupId = currentChatGroupId;

      if (!groupId) {
        groupId = id();
        createGroup({ groupId, title: content.slice(0, 50) + (content.length > 50 ? "..." : "") });
        setCurrentChatGroupId(groupId);
      }

      createMessage({ messageId: id(), groupId, content, parts });
    },
    [currentChatGroupId, createGroup, createMessage],
  );

  const handleNewChat = useCallback(() => {
    setCurrentChatGroupId(undefined);
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
              onSelectChat={setCurrentChatGroupId}
              handleClose={() => setIsOpen(false)}
            />
            <ChatBody chatGroupId={currentChatGroupId} />
            <ChatMessageInput onSendMessage={handleSendMessage} />
          </div>
        )
        : <ChatTrigger onClick={() => setIsOpen(true)} />}
    </>
  );
}
