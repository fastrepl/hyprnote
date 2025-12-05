import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { commands as templateCommands } from "@hypr/plugin-template";
import type { ChatMessage, ChatMessageStorage } from "@hypr/store";

import { CustomChatTransport } from "../../chat/transport";
import type { HyprUIMessage } from "../../chat/types";
import { useToolRegistry } from "../../contexts/tool";
import { useSession } from "../../hooks/tinybase";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/main";
import { id } from "../../utils";

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
  attachedSessionId?: string;
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
  attachedSessionId,
  children,
}: ChatSessionProps) {
  const transport = useTransport(attachedSessionId);
  const store = main.UI.useStore(main.STORE_ID);

  const { user_id } = main.UI.useValues(main.STORE_ID);

  const createChatMessage = main.UI.useSetRowCallback(
    "chat_messages",
    (p: Omit<ChatMessage, "user_id" | "created_at"> & { id: string }) => p.id,
    (p: Omit<ChatMessage, "user_id" | "created_at"> & { id: string }) =>
      ({
        user_id,
        chat_group_id: p.chat_group_id,
        content: p.content,
        created_at: new Date().toISOString(),
        role: p.role,
        metadata: JSON.stringify(p.metadata),
        parts: JSON.stringify(p.parts),
      }) satisfies ChatMessageStorage,
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

function useTransport(attachedSessionId?: string) {
  const registry = useToolRegistry();
  const model = useLanguageModel();
  const store = main.UI.useStore(main.STORE_ID);
  const language = main.UI.useValue("ai_language", main.STORE_ID) ?? "en";
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();

  const { title, rawMd, enhancedMd, createdAt } = useSession(
    attachedSessionId ?? "",
  );

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    attachedSessionId ?? "",
    main.STORE_ID,
  );
  const firstTranscriptId = transcriptIds?.[0];

  const wordIds = main.UI.useSliceRowIds(
    main.INDEXES.wordsByTranscript,
    firstTranscriptId ?? "",
    main.STORE_ID,
  );

  const words = useMemo(() => {
    if (!store || !wordIds || wordIds.length === 0) {
      return [];
    }

    const result: {
      text: string;
      start_ms: number;
      end_ms: number;
      channel: number;
      speaker?: string;
    }[] = [];

    for (const wordId of wordIds) {
      const row = store.getRow("words", wordId);
      if (row) {
        result.push({
          text: row.text as string,
          start_ms: row.start_ms as number,
          end_ms: row.end_ms as number,
          channel: row.channel as number,
          speaker: row.speaker as string | undefined,
        });
      }
    }

    return result.sort((a, b) => a.start_ms - b.start_ms);
  }, [store, wordIds]);

  const sessionContext = useMemo(() => {
    if (!attachedSessionId) {
      return null;
    }

    return {
      session: true,
      title: title as string | undefined,
      rawContent: rawMd as string | undefined,
      enhancedContent: enhancedMd as string | undefined,
      date: createdAt as string | undefined,
      words: words.length > 0 ? words : undefined,
    };
  }, [attachedSessionId, title, rawMd, enhancedMd, createdAt, words]);

  useEffect(() => {
    const templateParams = {
      language,
      ...(sessionContext ?? {}),
    };

    templateCommands
      .render("chat.system", templateParams)
      .then((result) => {
        if (result.status === "ok") {
          setSystemPrompt(result.data);
        }
      })
      .catch(console.error);
  }, [language, sessionContext]);

  const transport = useMemo(() => {
    if (!model) {
      return null;
    }

    return new CustomChatTransport(registry, model, systemPrompt);
  }, [registry, model, systemPrompt]);

  return transport;
}
