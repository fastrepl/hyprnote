import type { FileUIPart, TextUIPart } from "ai";
import { useCallback, useRef } from "react";

import type { HyprUIMessage } from "../../chat/types";
import { useShell } from "../../contexts/shell";
import { useLanguageModel } from "../../hooks/useLLMConnection";
import * as main from "../../store/tinybase/main";
import { id } from "../../utils";
import {
  type PersistedChatAttachment,
  saveChatAttachment,
} from "./attachments/storage";
import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatSession } from "./session";

type MessagePart = TextUIPart | FileUIPart | HyprUIMessage["parts"][number];

export function ChatView() {
  const { chat } = useShell();
  const { groupId, setGroupId } = chat;

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
      parts: MessagePart[];
      metadata: { createdAt: number };
    }) => p.id,
    (p: {
      id: string;
      chat_group_id: string;
      content: string;
      role: string;
      parts: MessagePart[];
      metadata: { createdAt: number };
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
    async (
      content: string,
      parts: MessagePart[],
      attachments: Array<{
        file: File;
        persisted?: PersistedChatAttachment;
      }>,
      sendMessage: (message: HyprUIMessage) => void,
    ) => {
      const messageId = id();
      let currentGroupId = groupId;
      if (!currentGroupId) {
        currentGroupId = id();
        const title = deriveChatTitle(content, parts);
        createChatGroup({ groupId: currentGroupId, title });
        setGroupId(currentGroupId);
      }

      const normalizedParts = await ensurePersistedAttachmentParts(
        parts,
        attachments,
        currentGroupId,
      );

      const metadata = { createdAt: Date.now() };
      const uiMessage: HyprUIMessage = {
        id: messageId,
        role: "user",
        parts: normalizedParts,
        metadata,
      };

      createChatMessage({
        id: messageId,
        chat_group_id: currentGroupId,
        content,
        role: "user",
        parts: normalizedParts,
        metadata,
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
      >
        {({ messages, sendMessage, regenerate, stop, status, error }) => (
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
              chatGroupId={groupId}
              onSendMessage={(content, parts, attachments) =>
                handleSendMessage(content, parts, attachments, sendMessage)
              }
            />
          </>
        )}
      </ChatSession>
    </div>
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

async function ensurePersistedAttachmentParts(
  parts: MessagePart[],
  attachments: Array<{
    file: File;
    persisted?: PersistedChatAttachment;
  }>,
  chatGroupId: string,
): Promise<MessagePart[]> {
  const needsPersistence = attachments.some(
    (attachment) => !attachment.persisted,
  );

  if (!needsPersistence) {
    return parts;
  }

  const newlySaved: PersistedChatAttachment[] = [];

  for (const attachment of attachments) {
    if (attachment.persisted) {
      continue;
    }
    const saved = await saveChatAttachment(chatGroupId, attachment.file);
    newlySaved.push(saved);
  }

  if (newlySaved.length === 0) {
    return parts;
  }

  let savedIndex = 0;
  return parts.map((part) => {
    if (part.type !== "file") {
      return part;
    }

    const saved = newlySaved[savedIndex++];
    if (!saved) {
      return part;
    }

    return {
      type: "data-chat-file",
      data: {
        type: "chat-file",
        attachmentId: saved.id,
        filename: saved.fileName,
        mediaType: saved.mimeType,
        size: saved.size,
        fileUrl: saved.fileUrl,
      },
    };
  });
}

function deriveChatTitle(content: string, parts: MessagePart[]): string {
  const fallback = "New chat";
  const trimmedContent = content.trim();
  const filePart = parts.find(
    (part) => part.type === "file" || part.type === "data-chat-file",
  );
  const filename =
    filePart?.type === "file"
      ? filePart.filename
      : filePart?.type === "data-chat-file"
        ? filePart.data.filename
        : undefined;
  const baseTitle = trimmedContent || filename || fallback;

  if (baseTitle.length <= 50) {
    return baseTitle;
  }

  return `${baseTitle.slice(0, 50)}...`;
}
