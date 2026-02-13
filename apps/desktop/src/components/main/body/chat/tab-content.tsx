import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import type { ContextEntity } from "../../../../chat/context-item";
import { composeContextEntities } from "../../../../chat/context/composer";
import type { HyprUIMessage } from "../../../../chat/types";
import { ElicitationProvider } from "../../../../contexts/elicitation";
import {
  useFeedbackLanguageModel,
  useLanguageModel,
} from "../../../../hooks/useLLMConnection";
import { useSupportMCP } from "../../../../hooks/useSupportMCPTools";
import { useChatContext } from "../../../../store/zustand/chat-context";
import type { Tab } from "../../../../store/zustand/tabs";
import { useTabs } from "../../../../store/zustand/tabs";
import { ChatBody } from "../../../chat/body";
import { ChatContent } from "../../../chat/content";
import { ChatSession } from "../../../chat/session";
import {
  useChatActions,
  useStableSessionId,
} from "../../../chat/use-chat-actions";
import { StandardTabWrapper } from "../index";

export function TabContentChat({
  tab,
}: {
  tab: Extract<Tab, { type: "chat" }>;
}) {
  const isSupport = tab.state.chatType === "support";

  return (
    <StandardTabWrapper>
      {isSupport ? (
        <SupportChatTabView tab={tab} />
      ) : (
        <GeneralChatTabView tab={tab} />
      )}
    </StandardTabWrapper>
  );
}

function GeneralChatTabView({ tab }: { tab: Extract<Tab, { type: "chat" }> }) {
  const groupId = tab.state.groupId ?? undefined;
  const updateChatTabState = useTabs((state) => state.updateChatTabState);
  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel();

  const persistedCtx = useChatContext((s) =>
    groupId ? s.contexts[groupId] : undefined,
  );
  const attachedSessionId = persistedCtx?.attachedSessionId ?? undefined;

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

function SupportChatTabView({ tab }: { tab: Extract<Tab, { type: "chat" }> }) {
  const groupId = tab.state.groupId ?? undefined;
  const updateChatTabState = useTabs((state) => state.updateChatTabState);
  const { session } = useAuth();

  const stableSessionId = useStableSessionId(groupId);
  const feedbackModel = useFeedbackLanguageModel();
  const {
    tools: mcpTools,
    systemPrompt,
    contextEntities: supportContextEntities,
    pendingElicitation,
    respondToElicitation,
    isReady,
  } = useSupportMCP(true, session?.access_token);

  const mcpToolCount = Object.keys(mcpTools).length;

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

  if (!isReady) {
    return (
      <div className="flex flex-col h-full bg-sky-50/40">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="size-4 animate-spin" />
            <span>Preparing support chat...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(["flex flex-col h-full", "bg-sky-50/40"])}>
      <ChatSession
        key={`${stableSessionId}-${mcpToolCount}`}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        modelOverride={feedbackModel}
        extraTools={mcpTools}
        systemPromptOverride={systemPrompt}
      >
        {(sessionProps) => (
          <SupportChatTabInner
            tab={tab}
            sessionProps={sessionProps}
            feedbackModel={feedbackModel}
            handleSendMessage={handleSendMessage}
            updateChatTabState={updateChatTabState}
            supportContextEntities={supportContextEntities}
            pendingElicitation={pendingElicitation}
            respondToElicitation={respondToElicitation}
          />
        )}
      </ChatSession>
    </div>
  );
}

function SupportChatTabInner({
  tab,
  sessionProps,
  feedbackModel,
  handleSendMessage,
  updateChatTabState,
  supportContextEntities,
  pendingElicitation,
  respondToElicitation,
}: {
  tab: Extract<Tab, { type: "chat" }>;
  sessionProps: {
    sessionId: string;
    messages: HyprUIMessage[];
    sendMessage: (message: HyprUIMessage) => void;
    regenerate: () => void;
    stop: () => void;
    status: "submitted" | "streaming" | "ready" | "error";
    error?: Error;
    contextEntities: ContextEntity[];
    onRemoveContextEntity: (key: string) => void;
    isSystemPromptReady: boolean;
  };
  feedbackModel: ReturnType<typeof useFeedbackLanguageModel>;
  handleSendMessage: (
    content: string,
    parts: HyprUIMessage["parts"],
    sendMessage: (message: HyprUIMessage) => void,
  ) => void;
  updateChatTabState: (
    tab: Extract<Tab, { type: "chat" }>,
    state: Extract<Tab, { type: "chat" }>["state"],
  ) => void;
  supportContextEntities: ContextEntity[];
  pendingElicitation?: { message: string } | null;
  respondToElicitation?: (approved: boolean) => void;
}) {
  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    contextEntities,
    onRemoveContextEntity,
    isSystemPromptReady,
  } = sessionProps;
  const sentRef = useRef(false);

  useEffect(() => {
    const initialMessage = tab.state.initialMessage;
    if (
      !initialMessage ||
      sentRef.current ||
      !feedbackModel ||
      status !== "ready" ||
      !isSystemPromptReady
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
    feedbackModel,
    status,
    isSystemPromptReady,
    handleSendMessage,
    sendMessage,
    updateChatTabState,
  ]);

  const mergedContextEntities = composeContextEntities([
    contextEntities,
    supportContextEntities,
  ]);

  return (
    <ChatContent
      sessionId={sessionProps.sessionId}
      messages={messages}
      sendMessage={sendMessage}
      regenerate={regenerate}
      stop={stop}
      status={status}
      error={error}
      model={feedbackModel}
      handleSendMessage={handleSendMessage}
      contextEntities={mergedContextEntities}
      onRemoveContextEntity={onRemoveContextEntity}
      isSystemPromptReady={isSystemPromptReady}
    >
      <ElicitationProvider
        pending={pendingElicitation ?? null}
        respond={respondToElicitation ?? null}
      >
        <ChatBody
          messages={messages}
          status={status}
          error={error}
          onReload={regenerate}
          isModelConfigured={!!feedbackModel}
        />
      </ElicitationProvider>
    </ChatContent>
  );
}
