import { Check, Loader2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../auth";
import type { HyprUIMessage } from "../../../chat/types";
import { useShell } from "../../../contexts/shell";
import {
  useFeedbackLanguageModel,
  useLanguageModel,
} from "../../../hooks/useLLMConnection";
import {
  type ContextItem,
  useSupportMCP,
} from "../../../hooks/useSupportMCPTools";
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

  const isSupport = tab.state.chatType === "support";

  return (
    <TabItemBase
      icon={<MessageCircle className="w-4 h-4" />}
      title={isSupport ? "Chat (Support)" : chatTitle || "Chat"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      accent={isSupport ? "blue" : "neutral"}
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
            mcpReady={isReady}
            contextItems={supportContextItems}
            pendingElicitation={pendingElicitation}
            respondToElicitation={respondToElicitation}
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
  contextItems,
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
    parts: any[],
    sendMessage: (message: HyprUIMessage) => void,
  ) => void;
  updateChatTabState: (
    tab: Extract<Tab, { type: "chat" }>,
    state: Extract<Tab, { type: "chat" }>["state"],
  ) => void;
  mcpReady: boolean;
  contextItems?: ContextItem[];
  pendingElicitation?: { message: string } | null;
  respondToElicitation?: (approved: boolean) => void;
}) {
  const sentRef = useRef(false);
  const isSupport = tab.state.chatType === "support";
  const waitingForMcp = isSupport && !mcpReady;

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

  const loadedItems = contextItems ?? [];

  return (
    <>
      <ChatBody
        messages={messages}
        status={status}
        error={error}
        onReload={regenerate}
        isModelConfigured={!!model}
      />
      {pendingElicitation && respondToElicitation && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-neutral-200 bg-amber-50/60 text-sm">
          <span className="flex-1 text-neutral-700">
            {pendingElicitation.message}
          </span>
          <button
            className="px-2.5 py-1 text-xs rounded border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-600"
            onClick={() => respondToElicitation(false)}
          >
            Decline
          </button>
          <button
            className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-white"
            onClick={() => respondToElicitation(true)}
            autoFocus
          >
            Approve
          </button>
        </div>
      )}
      {loadedItems.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400">
          <Check className="size-3" />
          {loadedItems.map((c) => (
            <span
              key={c.label}
              className="rounded bg-neutral-100 px-1.5 py-0.5"
            >
              {c.label}
            </span>
          ))}
          <span>loaded</span>
        </div>
      )}
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
