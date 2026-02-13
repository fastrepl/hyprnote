import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type ChatContext,
  type Participant,
  commands as templateCommands,
  type Transcript,
} from "@hypr/plugin-template";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

import {
  type ContextEntity,
  extractToolContextEntities,
} from "../../chat/context-item";
import { composeContextEntities } from "../../chat/context/composer";
import { CustomChatTransport } from "../../chat/transport";
import type { HyprUIMessage } from "../../chat/types";
import { useToolRegistry } from "../../contexts/tool";
import { useSession } from "../../hooks/tinybase";
import { useCreateChatMessage } from "../../hooks/useCreateChatMessage";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/store/main";
import { useChatContext } from "../../store/zustand/chat-context";
import { id } from "../../utils";
import { buildSegments, SegmentKey, type WordLike } from "../../utils/segment";
import {
  defaultRenderLabelContext,
  SpeakerLabelManager,
} from "../../utils/segment/shared";

interface ChatSessionProps {
  sessionId: string;
  chatGroupId?: string;
  attachedSessionId?: string;
  modelOverride?: LanguageModel;
  extraTools?: ToolSet;
  systemPromptOverride?: string;
  children: (props: {
    sessionId: string;
    messages: HyprUIMessage[];
    sendMessage: (message: HyprUIMessage) => void;
    regenerate: () => void;
    stop: () => void;
    status: ChatStatus;
    error?: Error;
    contextEntities: ContextEntity[];
    onRemoveContextEntity: (key: string) => void;
    isSystemPromptReady: boolean;
  }) => ReactNode;
}

export function ChatSession({
  sessionId,
  chatGroupId,
  attachedSessionId,
  modelOverride,
  extraTools,
  systemPromptOverride,
  children,
}: ChatSessionProps) {
  const { transport, sessionEntity, isSystemPromptReady } = useTransport(
    attachedSessionId,
    modelOverride,
    extraTools,
    systemPromptOverride,
  );

  const persistContext = useChatContext((s) => s.persistContext);
  const persistedCtx = useChatContext((s) =>
    chatGroupId ? s.contexts[chatGroupId] : undefined,
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

  const {
    messages,
    sendMessage: rawSendMessage,
    regenerate,
    stop,
    status,
    error,
  } = useChat({
    id: sessionId,
    messages: initialMessages,
    generateId: () => id(),
    transport: transport ?? undefined,
    onError: console.error,
  });

  useEffect(() => {
    persistedAssistantIds.current = new Set(
      initialAssistantMessages.map((m) => m.id),
    );
  }, [initialAssistantMessages]);

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

    if (status === "ready") {
      for (const message of messages) {
        if (
          message.role !== "assistant" ||
          persistedAssistantIds.current.has(message.id)
        ) {
          continue;
        }

        const content = message.parts
          .filter(
            (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
          )
          .map((p) => p.text)
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
    }

    prevMessagesRef.current = messages;
  }, [chatGroupId, messages, status, store, createChatMessage]);

  const toolEntities = useMemo(
    () => extractToolContextEntities(messages),
    [messages],
  );

  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRemovedKeys(new Set());
  }, [sessionId, chatGroupId]);

  const handleRemoveContextEntity = useCallback((key: string) => {
    setRemovedKeys((prev) => new Set(prev).add(key));
  }, []);

  const ephemeralEntities = useMemo(() => {
    const sessionEntities: ContextEntity[] = sessionEntity
      ? [sessionEntity]
      : [];
    const filtered = toolEntities.filter((e) => !removedKeys.has(e.key));
    return composeContextEntities([sessionEntities, filtered]);
  }, [sessionEntity, toolEntities, removedKeys]);

  const persistedEntities = persistedCtx?.contextEntities ?? [];

  const contextEntities = useMemo(() => {
    return composeContextEntities([persistedEntities, ephemeralEntities]);
  }, [persistedEntities, ephemeralEntities]);

  const contextEntitiesRef = useRef(contextEntities);
  contextEntitiesRef.current = contextEntities;

  // When chatGroupId first becomes defined (after first message creates the group),
  // persist the current context so it survives mode transitions.
  const prevChatGroupIdRef = useRef(chatGroupId);
  useEffect(() => {
    if (chatGroupId && !prevChatGroupIdRef.current) {
      persistContext(
        chatGroupId,
        attachedSessionId ?? null,
        contextEntitiesRef.current,
      );
    }
    prevChatGroupIdRef.current = chatGroupId;
  }, [chatGroupId, attachedSessionId, persistContext]);

  const sendMessage = useCallback(
    (message: HyprUIMessage) => {
      if (chatGroupId) {
        persistContext(
          chatGroupId,
          attachedSessionId ?? null,
          contextEntitiesRef.current,
        );
      }
      rawSendMessage(message);
    },
    [chatGroupId, attachedSessionId, persistContext, rawSendMessage],
  );

  return (
    <div className="flex-1 h-full flex flex-col">
      {children({
        sessionId,
        messages,
        sendMessage,
        regenerate,
        stop,
        status,
        error,
        contextEntities,
        onRemoveContextEntity: handleRemoveContextEntity,
        isSystemPromptReady,
      })}
    </div>
  );
}

function tiptapJsonToMarkdown(
  tiptapJson: string | undefined,
): string | undefined {
  if (typeof tiptapJson !== "string" || !tiptapJson.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(tiptapJson);
    if (!isValidTiptapContent(parsed)) {
      return undefined;
    }
    const md = json2md(parsed);
    return md.trim() || undefined;
  } catch {
    return undefined;
  }
}

function useTransport(
  attachedSessionId?: string,
  modelOverride?: LanguageModel,
  extraTools?: ToolSet,
  systemPromptOverride?: string,
) {
  const registry = useToolRegistry();
  const configuredModel = useLanguageModel();
  const model = modelOverride ?? configuredModel;
  const store = main.UI.useStore(main.STORE_ID);
  const language = main.UI.useValue("ai_language", main.STORE_ID) ?? "en";
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();

  const { title, rawMd, createdAt, event } = useSession(
    attachedSessionId ?? "",
  );

  const participantIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    attachedSessionId ?? "",
    main.STORE_ID,
  );

  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    attachedSessionId ?? "",
    main.STORE_ID,
  );

  const enhancedContent = useMemo((): string | undefined => {
    if (!store || !enhancedNoteIds || enhancedNoteIds.length === 0) {
      return undefined;
    }

    const parts: string[] = [];
    for (const noteId of enhancedNoteIds) {
      const content = store.getCell("enhanced_notes", noteId, "content") as
        | string
        | undefined;
      const md = tiptapJsonToMarkdown(content);
      if (md) {
        parts.push(md);
      }
    }

    return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
  }, [store, enhancedNoteIds]);

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

  const rawContentMd = useMemo(
    () => tiptapJsonToMarkdown(rawMd as string | undefined),
    [rawMd],
  );

  const participants = useMemo((): Participant[] => {
    if (!store || participantIds.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: Participant[] = [];

    for (const mappingId of participantIds) {
      const humanId = store.getCell(
        "mapping_session_participant",
        mappingId,
        "human_id",
      ) as string | undefined;
      if (!humanId || seen.has(humanId)) {
        continue;
      }

      seen.add(humanId);
      const name = store.getCell("humans", humanId, "name") as
        | string
        | undefined;
      if (!name) {
        continue;
      }

      const jobTitle = store.getCell("humans", humanId, "job_title") as
        | string
        | undefined;

      result.push({
        name,
        jobTitle: jobTitle || null,
      });
    }

    return result;
  }, [store, participantIds]);

  const sessionEntity = useMemo((): Extract<
    ContextEntity,
    { kind: "session" }
  > | null => {
    if (!attachedSessionId) {
      return null;
    }

    const titleStr = (title as string) || undefined;
    const dateStr = (createdAt as string) || undefined;
    const chatContext: ChatContext = {
      title: titleStr ?? null,
      date: dateStr ?? null,
      rawContent: rawContentMd ?? null,
      enhancedContent: enhancedContent ?? null,
      transcript: transcript ?? null,
      participants,
      event: event?.title ? { name: event.title } : null,
    };

    if (
      !titleStr &&
      !dateStr &&
      words.length === 0 &&
      !rawContentMd &&
      !enhancedContent &&
      participantIds.length === 0 &&
      !event?.title
    ) {
      return null;
    }

    return {
      kind: "session",
      key: "session:info",
      chatContext,
      wordCount: words.length > 0 ? words.length : undefined,
      participantCount: participants.length,
      eventTitle: event?.title ?? undefined,
    };
  }, [
    attachedSessionId,
    title,
    createdAt,
    rawContentMd,
    enhancedContent,
    words.length,
    participants,
    event,
    transcript,
  ]);

  const chatContext = sessionEntity?.chatContext ?? null;

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
        if (stale) {
          return;
        }

        if (result.status === "ok") {
          setSystemPrompt(result.data);
        } else {
          setSystemPrompt("");
        }
      })
      .catch((error) => {
        console.error(error);
        if (!stale) {
          setSystemPrompt("");
        }
      });

    return () => {
      stale = true;
    };
  }, [language, chatContext, systemPromptOverride]);

  const effectiveSystemPrompt = systemPromptOverride ?? systemPrompt;
  const isSystemPromptReady =
    typeof systemPromptOverride === "string" || systemPrompt !== undefined;

  const tools = useMemo(() => {
    const localTools = registry.getTools("chat-general");

    if (extraTools && import.meta.env.DEV) {
      for (const key of Object.keys(extraTools)) {
        if (key in localTools) {
          console.warn(
            `[ChatSession] Tool name collision: "${key}" exists in both local registry and extraTools. extraTools will take precedence.`,
          );
        }
      }
    }

    return {
      ...localTools,
      ...extraTools,
    };
  }, [registry, extraTools]);

  const transport = useMemo(() => {
    if (!model) {
      return null;
    }

    return new CustomChatTransport(model, tools, effectiveSystemPrompt);
  }, [model, tools, effectiveSystemPrompt]);

  return {
    transport,
    sessionEntity,
    isSystemPromptReady,
  };
}
