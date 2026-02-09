import { MessageCircle } from "lucide-react";
import { useCallback } from "react";

import { useShell } from "../../../contexts/shell";
import { useLanguageModel } from "../../../hooks/useLLMConnection";
import * as main from "../../../store/tinybase/store/main";
import type { Tab } from "../../../store/zustand/tabs";
import { useTabs } from "../../../store/zustand/tabs";
import { ChatBody } from "../../chat/body";
import { ChatMessageInput } from "../../chat/input";
import { ChatSession } from "../../chat/session";
import {
  useChatActions,
  useStableSessionId,
} from "../../chat/use-chat-actions";
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
      handleCloseAll={() => {
        chat.sendEvent({ type: "CLOSE" });
        handleCloseAll();
      }}
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
  const groupId = tab.state.groupId ?? undefined;
  const updateChatTabState = useTabs((state) => state.updateChatTabState);

  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel();

  const onGroupCreated = useCallback(
    (newGroupId: string) => updateChatTabState(tab, { groupId: newGroupId }),
    [updateChatTabState, tab],
  );

  const { handleSendMessage } = useChatActions({
    groupId,
    onGroupCreated,
  });

  return (
    <div className="flex flex-col h-full">
      <ChatSession
        key={stableSessionId}
        sessionId={stableSessionId}
        chatGroupId={groupId}
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
