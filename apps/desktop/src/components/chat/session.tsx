import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  type ChatContext,
  commands as templateCommands,
  type Transcript,
} from "@hypr/plugin-template";
import type { ChatMessage, ChatMessageStorage } from "@hypr/store";

import { CustomChatTransport } from "../../chat/transport";
import type { HyprUIMessage } from "../../chat/types";
import type { ContextRef } from "../../contexts/shell/chat";
import { useToolRegistry } from "../../contexts/tool";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/store/main";
import { id } from "../../utils";
import { buildSegments, SegmentKey, type WordLike } from "../../utils/segment";
import {
  defaultRenderLabelContext,
  SpeakerLabelManager,
} from "../../utils/segment/shared";

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
  contextRefs: ContextRef[];
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
  contextRefs,
  children,
}: ChatSessionProps) {
  const transport = useTransport(contextRefs);
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
      {children({
        messages,
        sendMessage,
        regenerate,
        stop,
        status,
        error,
      })}
    </div>
  );
}

function useTransport(contextRefs: ContextRef[]) {
  const registry = useToolRegistry();
  const model = useLanguageModel();
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const language = main.UI.useValue("ai_language", main.STORE_ID) ?? "en";
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();

  const sessionRefs = useMemo(
    () => contextRefs.filter((ref) => ref.type === "session"),
    [contextRefs],
  );

  const chatContext = useMemo((): ChatContext | null => {
    if (sessionRefs.length === 0 || !store || !indexes) {
      return null;
    }

    const firstSessionRef = sessionRefs[0];
    const session = store.getRow("sessions", firstSessionRef.id);
    if (!session) {
      return null;
    }

    const enhancedNoteIds = indexes.getSliceRowIds(
      main.INDEXES.enhancedNotesBySession,
      firstSessionRef.id,
    );
    const firstEnhancedNoteId = enhancedNoteIds?.[0];
    const enhancedNote = firstEnhancedNoteId
      ? store.getRow("enhanced_notes", firstEnhancedNoteId)
      : null;

    const transcriptIds = indexes.getSliceRowIds(
      main.INDEXES.transcriptBySession,
      firstSessionRef.id,
    );
    const firstTranscriptId = transcriptIds?.[0];

    let transcript: Transcript | null = null;
    if (firstTranscriptId) {
      const wordIds = indexes.getSliceRowIds(
        main.INDEXES.wordsByTranscript,
        firstTranscriptId,
      );

      if (wordIds && wordIds.length > 0) {
        const words: WordLike[] = [];
        for (const wordId of wordIds) {
          const row = store.getRow("words", wordId);
          if (row) {
            words.push({
              text: row.text as string,
              start_ms: row.start_ms as number,
              end_ms: row.end_ms as number,
              channel: row.channel as WordLike["channel"],
            });
          }
        }

        if (words.length > 0) {
          words.sort((a, b) => a.start_ms - b.start_ms);
          const segments = buildSegments(words, [], []);
          const ctx = defaultRenderLabelContext(store);
          const manager = SpeakerLabelManager.fromSegments(segments, ctx);

          transcript = {
            segments: segments.map((seg) => ({
              speaker: SegmentKey.renderLabel(seg.key, ctx, manager),
              text: seg.words.map((w) => w.text).join(" "),
            })),
            startedAt: null,
            endedAt: null,
          };
        }
      }
    }

    return {
      title: (session.title as string) || null,
      date: (session.created_at as string) || null,
      rawContent: (session.raw_md as string) || null,
      enhancedContent: (enhancedNote?.content as string) || null,
      transcript,
    };
  }, [sessionRefs, store, indexes]);

  useEffect(() => {
    templateCommands
      .render({
        chatSystem: {
          language,
          context: chatContext,
        },
      })
      .then((result) => {
        if (result.status === "ok") {
          setSystemPrompt(result.data);
        }
      })
      .catch(console.error);
  }, [language, chatContext]);

  const transport = useMemo(() => {
    if (!model) {
      return null;
    }

    return new CustomChatTransport(registry, model, systemPrompt);
  }, [registry, model, systemPrompt]);

  return transport;
}
