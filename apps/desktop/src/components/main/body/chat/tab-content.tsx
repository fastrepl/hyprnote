import { useCallback } from "react";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import {
  useFeedbackLanguageModel,
  useLanguageModel,
} from "../../../../hooks/useLLMConnection";
import { useSupportMCP } from "../../../../hooks/useSupportMCPTools";
import type { Tab } from "../../../../store/zustand/tabs";
import { useTabs } from "../../../../store/zustand/tabs";
import { ChatSession } from "../../../chat/session";
import {
  useChatActions,
  useStableSessionId,
} from "../../../chat/use-chat-actions";
import { StandardTabWrapper } from "../index";
import { ChatTabContent } from "./chat-content";

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
  const { session } = useAuth();

  const stableSessionId = useStableSessionId(groupId);
  const userModel = useLanguageModel();
  const feedbackModel = useFeedbackLanguageModel();
  const model = isSupport ? feedbackModel : userModel;
  const {
    tools: mcpTools,
    systemPrompt,
    contextItems,
    pendingElicitation,
    respondToElicitation,
    isReady,
  } = useSupportMCP(isSupport, session?.access_token);

  const mcpToolCount = Object.keys(mcpTools).length;
  const supportContextItems = isSupport ? contextItems : undefined;
  const supportSystemPrompt = isSupport ? systemPrompt : undefined;

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
    <div className={cn(["flex flex-col h-full", isSupport && "bg-sky-50/40"])}>
      <ChatSession
        key={`${stableSessionId}-${mcpToolCount}`}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        chatType={isSupport ? "support" : "general"}
        modelOverride={isSupport ? feedbackModel : undefined}
        extraTools={isSupport ? mcpTools : undefined}
        systemPromptOverride={supportSystemPrompt}
      >
        {({
          messages,
          sendMessage,
          regenerate,
          stop,
          status,
          error,
          contextItems: sessionContextItems,
        }) => (
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
            mcpReady={isReady}
            contextItems={[
              ...(supportContextItems ?? []),
              ...sessionContextItems,
            ]}
            pendingElicitation={pendingElicitation}
            respondToElicitation={respondToElicitation}
          />
        )}
      </ChatSession>
    </div>
  );
}
