import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import * as persisted from "../../store/tinybase/persisted";
import { CustomChatTransport } from "../../transport";
import { id } from "../../utils";

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
  onFinish: (message: UIMessage) => void;
  children: (props: {
    messages: UIMessage[];
    sendMessage: (message: UIMessage) => void;
    status: "submitted" | "streaming" | "ready" | "error";
    error?: Error;
  }) => ReactNode;
}

export function ChatSession({
  sessionId,
  chatGroupId,
  onFinish,
  children,
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
        loaded.push({
          id: messageId as string,
          role: row.role as "user" | "assistant",
          parts: JSON.parse(row.parts ?? "[]"),
          metadata: JSON.parse(row.metadata ?? "{}"),
        });
      }
    }
    return loaded;
  }, [store, messageIds, chatGroupId]);

  const handleFinish = useCallback(
    ({ message }: { message: UIMessage }) => {
      if (message.role === "assistant") {
        onFinish(message);
      }
    },
    [onFinish],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    generateId: () => id(),
    transport,
    onError: console.error,
    onFinish: handleFinish,
  });

  const displayMessages = messages.length > 0 ? messages : initialMessages;

  return <>{children({ messages: displayMessages, sendMessage, status, error })}</>;
}
