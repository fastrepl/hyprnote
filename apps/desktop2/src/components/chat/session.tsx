import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import * as persisted from "../../store/tinybase/persisted";
import { CustomChatTransport } from "../../transport";
import { id } from "../../utils";

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
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
  children,
}: ChatSessionProps) {
  const [transport] = useState(() => new CustomChatTransport());
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const { user_id } = persisted.useConfig();

  const createChatMessage = persisted.UI.useSetRowCallback(
    "chat_messages",
    (p: Omit<persisted.ChatMessage, "user_id" | "created_at"> & { id: string }) => p.id,
    (p: Omit<persisted.ChatMessage, "user_id" | "created_at"> & { id: string }) => ({
      user_id,
      chat_group_id: p.chat_group_id,
      content: p.content,
      created_at: new Date().toISOString(),
      role: p.role,
      metadata: JSON.stringify(p.metadata),
      parts: JSON.stringify(p.parts),
    } satisfies persisted.ChatMessageStorage),
    [user_id],
    persisted.STORE_ID,
  );

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

  const initialAssistantMessages = useMemo(() => {
    return initialMessages.filter((message) => message.role === "assistant");
  }, [initialMessages]);

  const persistedAssistantIds = useRef(new Set(initialAssistantMessages.map((message) => message.id)));

  useEffect(() => {
    persistedAssistantIds.current = new Set(initialAssistantMessages.map((message) => message.id));
  }, [initialAssistantMessages]);

  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    generateId: () => id(),
    transport,
    onError: console.error,
  });

  const displayMessages = useMemo(() => {
    const messageMap = new Map<string, UIMessage>();

    for (const msg of initialMessages) {
      messageMap.set(msg.id, msg);
    }

    for (const msg of messages) {
      messageMap.set(msg.id, msg);
    }

    return Array.from(messageMap.values());
  }, [initialMessages, messages]);

  useEffect(() => {
    if (!chatGroupId || status !== "ready") {
      return;
    }

    const targetMessages = displayMessages;
    for (const message of targetMessages) {
      if (message.role !== "assistant" || persistedAssistantIds.current.has(message.id)) {
        continue;
      }

      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("");

      createChatMessage({
        id: message.id,
        chat_group_id: chatGroupId,
        content,
        role: "assistant",
        parts: message.parts,
        metadata: message.metadata,
      });

      persistedAssistantIds.current.add(message.id);
    }
  }, [chatGroupId, createChatMessage, displayMessages, status]);

  return <>{children({ messages: displayMessages, sendMessage, status, error })}</>;
}
