import { MessageCircle } from "lucide-react";
import { useCallback, useRef } from "react";

import type { HyprUIMessage } from "../../../chat/types";
import { useShell } from "../../../contexts/shell";
import { useLanguageModel } from "../../../hooks/useLLMConnection";
import * as main from "../../../store/tinybase/store/main";
import type { Tab } from "../../../store/zustand/tabs";
import { useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { ChatBody } from "../../chat/body";
import { ChatMessageInput } from "../../chat/input";
import { ChatSession } from "../../chat/session";
import { StandardTabWrapper } from "./index";
import { type TabItem, TabItemBase } from "./shared";

export const TabItemChat: TabItem<Extract<Tab, { type: "chat" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  const { chat } = useShell();
  const chatTitle = main.UI.useCell(
    "chat_groups",
    tab.state.groupId || "",
    "title",
    main.STORE_ID,
  );

  return (
    <TabItemBase
      icon={<MessageCircle className="w-4 h-4" />}
      title={chatTitle || "Chat"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => {
        chat.sendEvent({ type: "CLOSE" });
        handleCloseThis(tab);
      }}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentChat({
  tab,
}: {
  tab: Extract<Tab, { type: "chat" }>;
}) {
  return (
    <StandardTabWrapper>
      <ChatTabView tab={tab} />
    </StandardTabWrapper>
  );
}

function ChatTabView({ tab }: { tab: Extract<Tab, { type: "chat" }> }) {
  const groupId = tab.state.groupId;
  const updateChatTabState = useTabs((state) => state.updateChatTabState);

  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel();

  const { user_id } = main.UI.useValues(main.STORE_ID);

  const createChatGroup = main.UI.useSetRowCallback(
    "chat_groups",
    (p: { groupId: string; title: string }) => p.groupId,
    (p: { groupId: string; title: string }) => ({
      user_id,
      created_at: new Date().toISOString(),
      title: p.title,
    }),
    [user_id],
    main.STORE_ID,
  );

  const createChatMessage = main.UI.useSetRowCallback(
    "chat_messages",
    (p: {
      id: string;
      chat_group_id: string;
      content: string;
      role: string;
      parts: any;
      metadata: any;
    }) => p.id,
    (p: {
      id: string;
      chat_group_id: string;
      content: string;
      role: string;
      parts: any;
      metadata: any;
    }) => ({
      user_id,
      chat_group_id: p.chat_group_id,
      content: p.content,
      created_at: new Date().toISOString(),
      role: p.role,
      metadata: JSON.stringify(p.metadata),
      parts: JSON.stringify(p.parts),
    }),
    [user_id],
    main.STORE_ID,
  );

  const handleSendMessage = useCallback(
    (
      content: string,
      parts: any[],
      sendMessage: (message: HyprUIMessage) => void,
    ) => {
      const messageId = id();
      const uiMessage: HyprUIMessage = {
        id: messageId,
        role: "user",
        parts,
        metadata: { createdAt: Date.now() },
      };

      let currentGroupId = groupId ?? undefined;
      if (!currentGroupId) {
        currentGroupId = id();
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        createChatGroup({ groupId: currentGroupId, title });
        updateChatTabState(tab, { groupId: currentGroupId });
      }

      createChatMessage({
        id: messageId,
        chat_group_id: currentGroupId,
        content,
        role: "user",
        parts,
        metadata: { createdAt: Date.now() },
      });

      sendMessage(uiMessage);
    },
    [groupId, createChatGroup, createChatMessage, updateChatTabState, tab],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatSession
        key={stableSessionId}
        sessionId={stableSessionId}
        chatGroupId={groupId ?? undefined}
      >
        {({ messages, sendMessage, regenerate, stop, status, error }) => (
          <>
            <ChatBody
              messages={messages}
              status={status}
              error={error}
              onReload={regenerate}
              isModelConfigured={!!model}
            />
            <ChatMessageInput
              disabled={!model || status !== "ready"}
              onSendMessage={(content, parts) =>
                handleSendMessage(content, parts, sendMessage)
              }
              isStreaming={status === "streaming" || status === "submitted"}
              onStop={stop}
            />
          </>
        )}
      </ChatSession>
    </div>
  );
}

function useStableSessionId(groupId: string | null) {
  const sessionIdRef = useRef<string | null>(null);
  const lastGroupIdRef = useRef<string | null>(groupId);

  if (sessionIdRef.current === null) {
    sessionIdRef.current = groupId ?? id();
  }

  if (groupId !== lastGroupIdRef.current) {
    const prev = lastGroupIdRef.current;
    lastGroupIdRef.current = groupId;

    if (prev !== null || groupId === null) {
      sessionIdRef.current = groupId ?? id();
    }
  }

  return sessionIdRef.current;
}
