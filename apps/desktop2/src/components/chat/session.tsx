import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import * as persisted from "../../store/tinybase/persisted";
import { CustomChatTransport } from "../../transport";
import { id } from "../../utils";

interface ChatSessionProps {
  chatGroupId?: string;
  onFinish: (message: UIMessage) => void;
  children: (props: {
    messages: UIMessage[];
    sendMessage: (message: UIMessage) => void;
    status: "submitted" | "streaming" | "ready" | "error";
    error?: Error;
  }) => ReactNode;
  queuedMessage?: UIMessage | null;
  onConsumeQueuedMessage?: () => void;
}

export function ChatSession({
  chatGroupId,
  onFinish,
  children,
  queuedMessage,
  onConsumeQueuedMessage,
}: ChatSessionProps) {
  const [transport] = useState(() => new CustomChatTransport());
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const messageIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.chatMessagesByGroup,
    chatGroupId ?? "",
    persisted.STORE_ID,
  );

  const initialMessages = useMemo((): UIMessage[] => {
    if (!store || !chatGroupId) {
      return [];
    }

    const loaded: UIMessage[] = [];
    for (const messageId of messageIds) {
      const row = store.getRow("chat_messages", messageId);
      if (row) {
        if (queuedMessage && queuedMessage.id === messageId) {
          continue;
        }
        loaded.push({
          id: messageId as string,
          role: row.role as "user" | "assistant",
          parts: JSON.parse(row.parts as string),
          metadata: JSON.parse(row.metadata as string),
        });
      }
    }
    return loaded;
  }, [store, messageIds, chatGroupId, queuedMessage]);

  const handleFinish = useCallback(
    ({ message }: { message: UIMessage }) => {
      if (message.role === "assistant") {
        onFinish(message);
      }
    },
    [onFinish],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: chatGroupId ?? "new",
    messages: initialMessages,
    generateId: () => id(),
    transport,
    onError: console.error,
    onFinish: handleFinish,
  });

  useEffect(() => {
    if (!queuedMessage || !chatGroupId || status !== "ready") {
      return;
    }

    sendMessage(queuedMessage);
    onConsumeQueuedMessage?.();
  }, [queuedMessage, chatGroupId, status, sendMessage, onConsumeQueuedMessage]);

  return <>{children({ messages, sendMessage, status, error })}</>;
}
