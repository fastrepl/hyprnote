import { useCallback, useEffect, useRef } from "react";

import type { HyprUIMessage } from "../../chat/types";
import { useShell } from "../../contexts/shell";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/store/main";
import { useTabs } from "../../store/zustand/tabs";
import { id } from "../../utils";
import { ChatBody } from "./body";
import { ContextBar } from "./context-bar";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";

export function ChatView() {
  const { chat } = useShell();
  const { groupId, setGroupId, refs, addRef, removeRef } = chat;
  const { currentTab, tabs } = useTabs();

  const stableSessionId = useStableSessionId(groupId);
  const model = useLanguageModel();

  useEffect(() => {
    if (currentTab?.type === "sessions") {
      addRef({ type: "session", id: currentTab.id, source: "auto" });
    }

    const sessionTabIds = new Set(
      tabs.filter((t) => t.type === "sessions").map((t) => t.id),
    );

    refs
      .filter((r) => r.source === "auto" && !sessionTabIds.has(r.id))
      .forEach((r) => removeRef(r.id));
  }, [currentTab, tabs, refs, addRef, removeRef]);

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
        contextRefs={refs}
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
}) {
  return (
    <>
      <ChatBody
        messages={messages}
        status={status}
        error={error}
        onReload={regenerate}
        isModelConfigured={!!model}
      />
      <ContextBar />
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
