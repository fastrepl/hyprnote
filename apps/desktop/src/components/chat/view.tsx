import { useCallback } from "react";

import { useShell } from "../../contexts/shell";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import { useTabs } from "../../store/zustand/tabs";
import { ChatContent } from "./content";
import { ChatHeader } from "./header";
import { ChatSession } from "./session";
import { useChatActions, useStableSessionId } from "./use-chat-actions";

export function ChatView() {
  const { chat } = useShell();
  const { groupId, setGroupId } = chat;
  const { currentTab } = useTabs();

  const attachedSessionId =
    currentTab?.type === "sessions" ? currentTab.id : undefined;

  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel();

  const { handleSendMessage } = useChatActions({
    groupId,
    onGroupCreated: setGroupId,
  });

  const handleNewChat = useCallback(() => {
    setGroupId(undefined);
  }, [setGroupId]);

  const handleSelectChat = useCallback(
    (selectedGroupId: string) => {
      setGroupId(selectedGroupId);
    },
    [setGroupId],
  );

  const openNew = useTabs((state) => state.openNew);
  const tabs = useTabs((state) => state.tabs);
  const updateChatTabState = useTabs((state) => state.updateChatTabState);

  const handleOpenInTab = useCallback(() => {
    const existingChatTab = tabs.find((t) => t.type === "chat");
    openNew({
      type: "chat",
      state: { groupId: groupId ?? null, initialMessage: null, chatType: null },
    });
    if (existingChatTab) {
      updateChatTabState(existingChatTab, {
        groupId: groupId ?? null,
        initialMessage: null,
        chatType: null,
      });
    }
    chat.sendEvent({ type: "OPEN_TAB" });
  }, [openNew, tabs, updateChatTabState, groupId, chat]);

  return (
    <div className="flex flex-col h-full gap-1">
      <ChatHeader
        currentChatGroupId={groupId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        handleClose={() => chat.sendEvent({ type: "CLOSE" })}
        onOpenInTab={handleOpenInTab}
      />
      <ChatSession
        key={stableSessionId}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        attachedSessionId={attachedSessionId}
      >
        {(sessionProps) => (
          <ChatContent
            {...sessionProps}
            model={model}
            handleSendMessage={handleSendMessage}
          />
        )}
      </ChatSession>
    </div>
  );
}
