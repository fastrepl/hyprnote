import { sep } from "@tauri-apps/api/path";

import type { ChatMessageStorage } from "@hypr/store";

import {
  type CollectorResult,
  getChatDir,
  iterateTableRows,
  safeParseJson,
  type TablesContent,
} from "../utils";

const SCHEMA_VERSION = 1;

type ChatGroupData = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
};

type NormalizedChatMessage = {
  id: string;
  user_id: string | null;
  created_at: string | null;
  chat_group_id: string | null;
  role: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  parts: unknown[] | null;
};

type ChatMetadataJson = {
  schemaVersion: number;
  exportId: string;
  exportedAt: string;
  chatGroup: ChatGroupData;
};

type MessagesJson = {
  schemaVersion: number;
  exportId: string;
  messageOrder: string[];
  messages: Record<string, NormalizedChatMessage>;
};

export type ChatCollectorResult = CollectorResult & {
  validChatGroupIds: Set<string>;
};

function normalizeMessage(
  message: ChatMessageStorage & { id: string },
): NormalizedChatMessage {
  const parsedParts = safeParseJson(message.parts);
  return {
    id: message.id,
    user_id: message.user_id ?? null,
    created_at: message.created_at ?? null,
    chat_group_id: message.chat_group_id ?? null,
    role: message.role ?? null,
    content: message.content ?? null,
    metadata: safeParseJson(message.metadata) ?? null,
    parts: Array.isArray(parsedParts) ? parsedParts : null,
  };
}

function compareMessages(
  a: ChatMessageStorage & { id: string },
  b: ChatMessageStorage & { id: string },
): number {
  const timeA = new Date(a.created_at || 0).getTime();
  const timeB = new Date(b.created_at || 0).getTime();
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  return a.id.localeCompare(b.id);
}

export function collectChatWriteOps(
  tables: TablesContent,
  dataDir: string,
): ChatCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];
  const exportedAt = new Date().toISOString();

  const chatGroups = iterateTableRows(tables, "chat_groups");
  const chatMessages = iterateTableRows(tables, "chat_messages");

  const chatGroupMap = new Map<string, ChatGroupData>();
  for (const group of chatGroups) {
    chatGroupMap.set(group.id, group);
  }

  const messagesByChatGroup = new Map<
    string,
    {
      chatGroup: ChatGroupData;
      messages: (ChatMessageStorage & { id: string })[];
    }
  >();

  for (const message of chatMessages) {
    const chatGroupId = message.chat_group_id;
    if (!chatGroupId) continue;

    const chatGroup = chatGroupMap.get(chatGroupId);
    if (!chatGroup) continue;

    const existing = messagesByChatGroup.get(chatGroupId);
    if (existing) {
      existing.messages.push(message);
    } else {
      messagesByChatGroup.set(chatGroupId, {
        chatGroup,
        messages: [message],
      });
    }
  }

  for (const [chatGroupId, { chatGroup, messages }] of messagesByChatGroup) {
    const chatDir = getChatDir(dataDir, chatGroupId);
    dirs.add(chatDir);

    const exportId = crypto.randomUUID();
    const sortedMessages = messages.sort(compareMessages);
    const messageOrder = sortedMessages.map((m) => m.id);
    const messagesMap: Record<string, NormalizedChatMessage> = {};
    for (const message of sortedMessages) {
      messagesMap[message.id] = normalizeMessage(message);
    }

    const chatMetadata: ChatMetadataJson = {
      schemaVersion: SCHEMA_VERSION,
      exportId,
      exportedAt,
      chatGroup,
    };

    const messagesContent: MessagesJson = {
      schemaVersion: SCHEMA_VERSION,
      exportId,
      messageOrder,
      messages: messagesMap,
    };

    operations.push({
      type: "json",
      path: [chatDir, "chat.json"].join(sep()),
      content: chatMetadata,
    });

    operations.push({
      type: "json",
      path: [chatDir, "messages.json"].join(sep()),
      content: messagesContent,
    });
  }

  return {
    dirs,
    operations,
    validChatGroupIds: new Set(messagesByChatGroup.keys()),
  };
}
