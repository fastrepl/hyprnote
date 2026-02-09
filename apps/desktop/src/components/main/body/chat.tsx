import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import type { HyprUIMessage } from "../../../chat/types";
import { useShell } from "../../../contexts/shell";
import {
  useFeedbackLanguageModel,
  useLanguageModel,
} from "../../../hooks/useLLMConnection";
import { useSupportMCPTools } from "../../../hooks/useSupportMCPTools";
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
  const isSupport = tab.state.chatType === "support";
  const updateChatTabState = useTabs((state) => state.updateChatTabState);

  const stableSessionId = useStableSessionId(groupId);
  const userModel = useLanguageModel();
  const feedbackModel = useFeedbackLanguageModel();
  const model = isSupport ? feedbackModel : userModel;
  const { tools: mcpTools, isReady: mcpReady } = useSupportMCPTools(isSupport);

  const onGroupCreated = useCallback(
    (newGroupId: string) =>
      updateChatTabState(tab, {
        ...tab.state,
        groupId: newGroupId,
        initialMessage: null,
      }),
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
        modelOverride={isSupport ? feedbackModel : undefined}
        extraTools={isSupport ? mcpTools : undefined}
      >
        {({ messages, sendMessage, regenerate, stop, status, error }) => (
          <ChatTabContent
            tab={tab}
            messages={messages}
            sendMessage={sendMessage}
            regenerate={regenerate}
            stop={stop}
            status={status}
            error={error}
            model={model}
            handleSendMessage={handleSendMessage}
            updateChatTabState={updateChatTabState}
            mcpReady={mcpReady}
          />
        )}
      </ChatSession>
    </div>
  );
}

function ChatTabContent({
  tab,
  messages,
  sendMessage,
  regenerate,
  stop,
  status,
  error,
  model,
  handleSendMessage,
  updateChatTabState,
  mcpReady,
}: {
  tab: Extract<Tab, { type: "chat" }>;
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
  updateChatTabState: (
    tab: Extract<Tab, { type: "chat" }>,
    state: Extract<Tab, { type: "chat" }>["state"],
  ) => void;
  mcpReady: boolean;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    const initialMessage = tab.state.initialMessage;
    if (
      !initialMessage ||
      sentRef.current ||
      !model ||
      status !== "ready" ||
      !mcpReady
    ) {
      return;
    }

    sentRef.current = true;
    handleSendMessage(
      initialMessage,
      [{ type: "text", text: initialMessage }],
      sendMessage,
    );
    updateChatTabState(tab, {
      ...tab.state,
      initialMessage: null,
    });
  }, [
    tab,
    model,
    status,
    mcpReady,
    handleSendMessage,
    sendMessage,
    updateChatTabState,
  ]);

  return (
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
  );
}
