import { useCallback, useMemo } from "react";

import type { ContextItem } from "../../chat/context-item";
import type { HyprUIMessage } from "../../chat/types";
import { useShell } from "../../contexts/shell";
import { useSession } from "../../hooks/tinybase";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import { useTabs } from "../../store/zustand/tabs";
import { ChatBody } from "./body";
import { ContextBar } from "./context-bar";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
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
        {({
          messages,
          sendMessage,
          regenerate,
          stop,
          status,
          error,
          contextItems,
        }) => (
          <ChatViewContent
            messages={messages}
            sendMessage={sendMessage}
            regenerate={regenerate}
            stop={stop}
            status={status}
            error={error}
            model={model}
            handleSendMessage={handleSendMessage}
            attachedSessionId={attachedSessionId}
            contextItems={contextItems}
          />
        )}
      </ChatSession>
    </div>
  );
}

function ChatViewContent({
  messages,
  sendMessage,
  regenerate,
  stop,
  status,
  error,
  model,
  handleSendMessage,
  attachedSessionId,
  contextItems,
}: {
  messages: HyprUIMessage[];
  sendMessage: (message: HyprUIMessage) => void;
  regenerate: () => void;
  stop: () => void;
  status: "submitted" | "streaming" | "ready" | "error";
  error?: Error;
  model: ReturnType<typeof useLanguageModel>;
  handleSendMessage: (
    content: string,
    parts: any[],
    sendMessage: (message: HyprUIMessage) => void,
  ) => void;
  attachedSessionId?: string;
  contextItems: ContextItem[];
}) {
  const { title } = useSession(attachedSessionId ?? "");

  const attachedSession = useMemo(() => {
    if (!attachedSessionId) return undefined;
    return { id: attachedSessionId, title: (title as string) || undefined };
  }, [attachedSessionId, title]);

  return (
    <>
      <ChatBody
        messages={messages}
        status={status}
        error={error}
        onReload={regenerate}
        isModelConfigured={!!model}
      />
      <ContextBar items={contextItems} />
      <ChatMessageInput
        disabled={!model || status !== "ready"}
        onSendMessage={(content, parts) =>
          handleSendMessage(content, parts, sendMessage)
        }
        attachedSession={attachedSession}
        isStreaming={status === "streaming" || status === "submitted"}
        onStop={stop}
      />
    </>
  );
}
