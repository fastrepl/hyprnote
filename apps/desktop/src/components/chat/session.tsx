import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import type { LanguageModel } from "ai";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  commands as templateCommands,
  type Transcript,
} from "@hypr/plugin-template";

import type { ContextItem, ContextSource } from "../../chat/context-item";
import { CustomChatTransport } from "../../chat/transport";
import type { HyprUIMessage } from "../../chat/types";
import { useToolRegistry } from "../../contexts/tool";
import { useSession } from "../../hooks/tinybase";
import { useContextCollection } from "../../hooks/useContextCollection";
import { useCreateChatMessage } from "../../hooks/useCreateChatMessage";
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
  chatType?: "general" | "support";
  attachedSessionId?: string;
  modelOverride?: LanguageModel;
  extraTools?: Record<string, any>;
  systemPromptOverride?: string;
  children: (props: {
    messages: HyprUIMessage[];
    sendMessage: (message: HyprUIMessage) => void;
    regenerate: () => void;
    stop: () => void;
    status: ChatStatus;
    error?: Error;
    contextItems: ContextItem[];
  }) => ReactNode;
}

export function ChatSession({
  sessionId,
  chatGroupId,
  chatType = "general",
  attachedSessionId,
  modelOverride,
  extraTools,
  systemPromptOverride,
  children,
}: ChatSessionProps) {
  const { transport, sessionTitle, sessionDate, wordCount, notePreview } =
    useTransport(
      chatType,
      attachedSessionId,
      modelOverride,
      extraTools,
      systemPromptOverride,
    );

  const contextItems = useSessionContextItems(
    attachedSessionId,
    sessionTitle,
    sessionDate,
    wordCount,
    notePreview,
  );
  const store = main.UI.useStore(main.STORE_ID);
  const createChatMessage = useCreateChatMessage();

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
        let parsedParts: HyprUIMessage["parts"] = [];
        let parsedMetadata: Record<string, unknown> = {};
        try {
          parsedParts = JSON.parse(row.parts ?? "[]");
        } catch {}
        try {
          parsedMetadata = JSON.parse(row.metadata ?? "{}");
        } catch {}
        loaded.push({
          id: messageId as string,
          role: row.role as "user" | "assistant",
          parts: parsedParts,
          metadata: parsedMetadata,
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
        contextItems,
      })}
    </div>
  );
}

function useSessionContextItems(
  attachedSessionId?: string,
  sessionTitle?: string | null,
  sessionDate?: string | null,
  wordCount?: number,
  notePreview?: string | null,
): ContextItem[] {
  const sources = useMemo(() => {
    if (!attachedSessionId) return [];
    const s: ContextSource[] = [];
    if (sessionTitle || sessionDate) {
      s.push({
        type: "session",
        title: sessionTitle ?? undefined,
        date: sessionDate ?? undefined,
      });
    }
    if (wordCount && wordCount > 0) {
      s.push({ type: "transcript", wordCount });
    }
    if (notePreview) {
      s.push({ type: "note", preview: notePreview });
    }
    return s;
  }, [attachedSessionId, sessionTitle, sessionDate, wordCount, notePreview]);

  return useContextCollection(sources);
}

function useTransport(
  chatType: "general" | "support",
  attachedSessionId?: string,
  modelOverride?: LanguageModel,
  extraTools?: Record<string, any>,
  systemPromptOverride?: string,
) {
  const registry = useToolRegistry();
  const configuredModel = useLanguageModel();
  const model = modelOverride ?? configuredModel;
  const store = main.UI.useStore(main.STORE_ID);
  const language = main.UI.useValue("ai_language", main.STORE_ID) ?? "en";
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();

  const { title, rawMd, createdAt } = useSession(attachedSessionId ?? "");

  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    attachedSessionId ?? "",
    main.STORE_ID,
  );
  const firstEnhancedNoteId = enhancedNoteIds?.[0];
  const enhancedContent = main.UI.useCell(
    "enhanced_notes",
    firstEnhancedNoteId ?? "",
    "content",
    main.STORE_ID,
  );

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    attachedSessionId ?? "",
    main.STORE_ID,
  );
  const firstTranscriptId = transcriptIds?.[0];

  const wordsJson = main.UI.useCell(
    "transcripts",
    firstTranscriptId ?? "",
    "words",
    main.STORE_ID,
  ) as string | undefined;

  const words = useMemo((): WordLike[] => {
    if (!wordsJson) {
      return [];
    }

    try {
      const parsedWords = JSON.parse(wordsJson) as Array<{
        text: string;
        start_ms: number;
        end_ms: number;
        channel: number;
      }>;

      return parsedWords
        .map((w) => ({
          text: w.text,
          start_ms: w.start_ms,
          end_ms: w.end_ms,
          channel: w.channel as WordLike["channel"],
        }))
        .sort((a, b) => a.start_ms - b.start_ms);
    } catch {
      return [];
    }
  }, [wordsJson]);

  const transcript = useMemo((): Transcript | null => {
    if (words.length === 0 || !store) {
      return null;
    }

    const segments = buildSegments(words, [], []);
    const ctx = defaultRenderLabelContext(store);
    const manager = SpeakerLabelManager.fromSegments(segments, ctx);

    return {
      segments: segments.map((seg) => ({
        speaker: SegmentKey.renderLabel(seg.key, ctx, manager),
        text: seg.words.map((w) => w.text).join(" "),
      })),
      startedAt: null,
      endedAt: null,
    };
  }, [words, store]);

  const chatContext = useMemo(() => {
    if (!attachedSessionId) {
      return null;
    }

    return {
      title: (title as string) || null,
      date: (createdAt as string) || null,
      rawContent: (rawMd as string) || null,
      enhancedContent: (enhancedContent as string) || null,
      transcript,
    };
  }, [attachedSessionId, title, rawMd, enhancedContent, createdAt, transcript]);

  useEffect(() => {
    if (systemPromptOverride) {
      setSystemPrompt(systemPromptOverride);
      return;
    }

    let stale = false;

    templateCommands
      .render({
        chatSystem: {
          language,
          context: chatContext,
        },
      })
      .then((result) => {
        if (!stale && result.status === "ok") {
          setSystemPrompt(result.data);
        }
      })
      .catch(console.error);

    return () => {
      stale = true;
    };
  }, [language, chatContext, systemPromptOverride]);

  const effectiveSystemPrompt = systemPromptOverride ?? systemPrompt;

  const transport = useMemo(() => {
    if (!model) {
      return null;
    }

    return new CustomChatTransport(
      registry,
      model,
      chatType,
      effectiveSystemPrompt,
      extraTools,
    );
  }, [registry, model, chatType, effectiveSystemPrompt, extraTools]);

  const sessionTitle = (title as string) || null;
  const sessionDate = (createdAt as string) || null;
  const notePreview = (enhancedContent as string) || null;

  return {
    transport,
    sessionTitle,
    sessionDate,
    wordCount: words.length,
    notePreview,
  };
}
