import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import type { ContextItem } from "../../../../chat/context-item";
import type { HyprUIMessage } from "../../../../chat/types";
import { ElicitationProvider } from "../../../../contexts/elicitation";
import {
  useFeedbackLanguageModel,
  useLanguageModel,
} from "../../../../hooks/useLLMConnection";
import { useSupportMCP } from "../../../../hooks/useSupportMCPTools";
import type { Tab } from "../../../../store/zustand/tabs";
import { useTabs } from "../../../../store/zustand/tabs";
import { ChatBody } from "../../../chat/body";
import { ContextBar } from "../../../chat/context-bar";
import { ChatMessageInput } from "../../../chat/input";
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
    contextItems: supportContextItems,
    pendingElicitation,
    respondToElicitation,
    isReady,
  } = useSupportMCP(isSupport, session?.access_token);

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

  const waitingForMcp = isSupport && !isReady;

  return (
    <div className={cn(["flex flex-col h-full", isSupport && "bg-sky-50/40"])}>
      <ChatSession
        key={`${stableSessionId}-${mcpToolCount}`}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        chatType={isSupport ? "support" : "general"}
        modelOverride={isSupport ? feedbackModel : undefined}
        extraTools={isSupport ? mcpTools : undefined}
        systemPromptOverride={isSupport ? systemPrompt : undefined}
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
          <ChatTabInner
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
            waitingForMcp={waitingForMcp}
            isReady={isReady}
            supportContextItems={isSupport ? supportContextItems : undefined}
            sessionContextItems={sessionContextItems}
            pendingElicitation={pendingElicitation}
            respondToElicitation={respondToElicitation}
          />
        )}
      </ChatSession>
    </div>
  );
}

function ChatTabInner({
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
  waitingForMcp,
  isReady,
  supportContextItems,
  sessionContextItems,
  pendingElicitation,
  respondToElicitation,
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
    parts: HyprUIMessage["parts"],
    sendMessage: (message: HyprUIMessage) => void,
  ) => void;
  updateChatTabState: (
    tab: Extract<Tab, { type: "chat" }>,
    state: Extract<Tab, { type: "chat" }>["state"],
  ) => void;
  waitingForMcp: boolean;
  isReady: boolean;
  supportContextItems?: ContextItem[];
  sessionContextItems: ContextItem[];
  pendingElicitation?: { message: string } | null;
  respondToElicitation?: (approved: boolean) => void;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    const initialMessage = tab.state.initialMessage;
    if (
      !initialMessage ||
      sentRef.current ||
      !model ||
      status !== "ready" ||
      !isReady
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
    isReady,
    handleSendMessage,
    sendMessage,
    updateChatTabState,
  ]);

  const mergedContextItems = useMemo(
    () => [...(supportContextItems ?? []), ...sessionContextItems],
    [supportContextItems, sessionContextItems],
  );

  if (waitingForMcp) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="size-4 animate-spin" />
          <span>Preparing support chat...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ElicitationProvider
        pending={pendingElicitation ?? null}
        respond={respondToElicitation ?? null}
      >
        <ChatBody
          messages={messages}
          status={status}
          error={error}
          onReload={regenerate}
          isModelConfigured={!!model}
        />
      </ElicitationProvider>
      <ContextBar items={mergedContextItems} />
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
