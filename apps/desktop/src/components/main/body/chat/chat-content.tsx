import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ContextItem } from "../../../../chat/context-item";
import type { HyprUIMessage } from "../../../../chat/types";
import { ElicitationProvider } from "../../../../contexts/elicitation";
import { useLanguageModel } from "../../../../hooks/useLLMConnection";
import type { Tab } from "../../../../store/zustand/tabs";
import { ChatBody } from "../../../chat/body";
import { ContextBar } from "../../../chat/context-bar";
import { ChatMessageInput } from "../../../chat/input";

export function ChatTabContent({
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
      <ContextBar items={contextItems ?? []} />
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
