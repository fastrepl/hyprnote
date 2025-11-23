import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { CustomChatTransport } from "../../chat/transport";
import type { HyprUIMessage } from "../../chat/types";
import { useToolRegistry } from "../../contexts/tool";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/main";
import { id } from "../../utils";

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
  children: (props: {
    messages: HyprUIMessage[];
    sendMessage: (message: HyprUIMessage) => void;
    regenerate: () => void;
    stop: () => void;
    status: ChatStatus;
    error?: Error;
  }) => ReactNode;
}

export function ChatSession({
  sessionId,
  chatGroupId,
  children,
}: ChatSessionProps) {
  const transport = useTransport(chatGroupId);
  const store = main.UI.useStore(main.STORE_ID);

  const { user_id } = main.UI.useValues(main.STORE_ID);

  const createChatMessage = main.UI.useSetRowCallback(
    "chat_messages",
    (p: Omit<main.ChatMessage, "user_id" | "created_at"> & { id: string }) =>
      p.id,
    (p: Omit<main.ChatMessage, "user_id" | "created_at"> & { id: string }) =>
      ({
        user_id,
        chat_group_id: p.chat_group_id,
        content: p.content,
        created_at: new Date().toISOString(),
        role: p.role,
        metadata: JSON.stringify(p.metadata),
        parts: JSON.stringify(p.parts),
      }) satisfies main.ChatMessageStorage,
    [user_id],
    main.STORE_ID,
  );

  const messageIds = main.UI.useSliceRowIds(
    main.INDEXES.chatMessagesByGroup,
    chatGroupId ?? "",
    main.STORE_ID,
  );

  const initialMessages = useMemo((): HyprUIMessage[] => {
    if (!store || !chatGroupId) {
      return [];
    }

    const loaded: HyprUIMessage[] = [];
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

  const persistedAssistantIds = useRef(
    new Set(initialAssistantMessages.map((message) => message.id)),
  );
  const prevMessagesRef = useRef<HyprUIMessage[]>(initialMessages);

  useEffect(() => {
    persistedAssistantIds.current = new Set(
      initialAssistantMessages.map((message) => message.id),
    );
  }, [initialAssistantMessages]);

  const { messages, sendMessage, regenerate, stop, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    generateId: () => id(),
    transport: transport ?? undefined,
    onError: console.error,
  });

  useEffect(() => {
    if (!chatGroupId || !store) {
      prevMessagesRef.current = messages;
      return;
    }

    const currentMessageIds = new Set(messages.map((m) => m.id));

    for (const prevMessage of prevMessagesRef.current) {
      if (
        prevMessage.role === "assistant" &&
        persistedAssistantIds.current.has(prevMessage.id) &&
        !currentMessageIds.has(prevMessage.id)
      ) {
        store.delRow("chat_messages", prevMessage.id);
        persistedAssistantIds.current.delete(prevMessage.id);
      }
    }

    prevMessagesRef.current = messages;
  }, [chatGroupId, messages, store]);

  useEffect(() => {
    if (!chatGroupId || status !== "ready") {
      return;
    }

    for (const message of messages) {
      if (
        message.role !== "assistant" ||
        persistedAssistantIds.current.has(message.id)
      ) {
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
  }, [chatGroupId, createChatMessage, messages, status]);

  return (
    <div className="flex-1 h-full flex flex-col">
      {children({ messages, sendMessage, regenerate, stop, status, error })}
    </div>
  );
}

function useTransport(chatGroupId?: string) {
  const registry = useToolRegistry();
  const model = useLanguageModel();

  const transport = useMemo(() => {
    if (!model) {
      return null;
    }

    return new CustomChatTransport(registry, model, chatGroupId);
  }, [registry, model, chatGroupId]);

  return transport;
}
