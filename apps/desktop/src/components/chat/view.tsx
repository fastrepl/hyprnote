import { useCallback, useMemo, useRef } from "react";

import type { HyprUIMessage } from "../../chat/types";
import { useShell } from "../../contexts/shell";
import { useSession } from "../../hooks/tinybase";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/main";
import { useTabs } from "../../store/zustand/tabs";
import { id } from "../../utils";
import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";

export function ChatView() {
  const { chat } = useShell();
  const { groupId, setGroupId } = chat;
  const { currentTab } = useTabs();

  const attachedSessionId =
    currentTab?.type === "sessions" ? currentTab.id : undefined;

  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel();

  const { user_id } = main.UI.useValues(main.STORE_ID);

  const createChatGroup = main.UI.useSetRowCallback(
    "chat_groups",
    (p: { groupId: string; title: string }) => p.groupId,
    (p: { groupId: string; title: string }) => ({
      user_id,
      created_at: new Date().toISOString(),
      title: p.title,
    }),
    [user_id],
    main.STORE_ID,
  );

  const createChatMessage = main.UI.useSetRowCallback(
    "chat_messages",
    (p: {
      id: string;
      chat_group_id: string;
      content: string;
      role: string;
      parts: any;
      metadata: any;
    }) => p.id,
    (p: {
      id: string;
      chat_group_id: string;
      content: string;
      role: string;
      parts: any;
      metadata: any;
    }) => ({
      user_id,
      chat_group_id: p.chat_group_id,
      content: p.content,
      created_at: new Date().toISOString(),
      role: p.role,
      metadata: JSON.stringify(p.metadata),
      parts: JSON.stringify(p.parts),
    }),
    [user_id],
    main.STORE_ID,
  );

  const handleSendMessage = useCallback(
    (
      content: string,
      parts: any[],
      sendMessage: (message: HyprUIMessage) => void,
    ) => {
      const messageId = id();
      const uiMessage: HyprUIMessage = {
        id: messageId,
        role: "user",
        parts,
        metadata: { createdAt: Date.now() },
      };

      let currentGroupId = groupId;
      if (!currentGroupId) {
        currentGroupId = id();
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        createChatGroup({ groupId: currentGroupId, title });
        setGroupId(currentGroupId);
      }

      createChatMessage({
        id: messageId,
        chat_group_id: currentGroupId,
        content,
        role: "user",
        parts,
        metadata: { createdAt: Date.now() },
      });

      sendMessage(uiMessage);
    },
    [groupId, createChatGroup, createChatMessage, setGroupId],
  );

  const handleNewChat = useCallback(() => {
    setGroupId(undefined);
  }, [setGroupId]);

  const handleSelectChat = useCallback(
    (selectedGroupId: string) => {
      setGroupId(selectedGroupId);
    },
    [setGroupId],
  );

  return (
    <div className="flex flex-col h-full gap-1">
      <ChatHeader
        currentChatGroupId={groupId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        handleClose={() => chat.sendEvent({ type: "CLOSE" })}
      />

      <ChatSession
        key={stableSessionId}
        sessionId={stableSessionId}
        chatGroupId={groupId}
        attachedSessionId={attachedSessionId}
      >
        {({ messages, sendMessage, regenerate, stop, status, error }) => (
          <ChatViewContent
            messages={messages}
            sendMessage={sendMessage}
            regenerate={regenerate}
            stop={stop}
            status={status}
            error={error}
            model={model}
            handleSendMessage={handleSendMessage}
            attachedSessionId={attachedSessionId}
          />
        )}
      </ChatSession>
    </div>
  );
}

function ChatViewContent({
  messages,
  sendMessage,
  regenerate,
  stop,
  status,
  error,
  model,
  handleSendMessage,
  attachedSessionId,
}: {
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
  attachedSessionId?: string;
}) {
  const { title } = useSession(attachedSessionId ?? "");

  const attachedSession = useMemo(() => {
    if (!attachedSessionId) return undefined;
    return { id: attachedSessionId, title: (title as string) || undefined };
  }, [attachedSessionId, title]);

  return (
    <>
      <ChatBody
        messages={messages}
        status={status}
        error={error}
        onReload={regenerate}
        onStop={stop}
        isModelConfigured={!!model}
      />
      <ChatMessageInput
        disabled={!model || status !== "ready"}
        onSendMessage={(content, parts) =>
          handleSendMessage(content, parts, sendMessage)
        }
        attachedSession={attachedSession}
      />
    </>
  );
}

function useStableSessionId(groupId: string | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const lastGroupIdRef = useRef<string | undefined>(groupId);

  if (sessionIdRef.current === null) {
    sessionIdRef.current = groupId ?? id();
  }

  if (groupId !== lastGroupIdRef.current) {
    const prev = lastGroupIdRef.current;
    lastGroupIdRef.current = groupId;

    if (prev !== undefined || groupId === undefined) {
      sessionIdRef.current = groupId ?? id();
    }
  }

  return sessionIdRef.current;
}
