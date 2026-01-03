import { sep } from "@tauri-apps/api/path";
import { exists, readDir, remove } from "@tauri-apps/plugin-fs";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { ChatMessageStorage } from "@hypr/store";

import {
  createModeAwarePersister,
  getChatDir,
  getDataDir,
  isUUID,
  iterateTableRows,
  type PersisterMode,
  type TablesContent,
  writeJsonFiles,
} from "./utils";

type ChatGroupData = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
};

type ChatMessageWithId = ChatMessageStorage & { id: string };

type ChatJson = {
  chat_group: ChatGroupData;
  messages: ChatMessageWithId[];
};

function collectChatWriteOps(
  tables: TablesContent | undefined,
  dataDir: string,
): {
  dirs: Set<string>;
  operations: Array<{ path: string; content: ChatJson }>;
  validChatGroupIds: Set<string>;
} {
  const dirs = new Set<string>();
  const operations: Array<{ path: string; content: ChatJson }> = [];

  const chatGroups = iterateTableRows(tables, "chat_groups");
  const chatMessages = iterateTableRows(tables, "chat_messages");

  const chatGroupMap = new Map<string, ChatGroupData>();
  for (const group of chatGroups) {
    chatGroupMap.set(group.id, group);
  }

  const messagesByChatGroup = new Map<
    string,
    { chatGroup: ChatGroupData; messages: ChatMessageWithId[] }
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

    operations.push({
      path: [chatDir, "_messages.json"].join(sep()),
      content: {
        chat_group: chatGroup,
        messages: messages.sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime(),
        ),
      },
    });
  }

  return {
    dirs,
    operations,
    validChatGroupIds: new Set(messagesByChatGroup.keys()),
  };
}

async function cleanupOrphanChatDirs(
  dataDir: string,
  validChatGroupIds: Set<string>,
): Promise<void> {
  const chatsDir = [dataDir, "chats"].join(sep());

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(chatsDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory) continue;

    const messagesPath = [chatsDir, entry.name, "_messages.json"].join(sep());
    const hasMessagesJson = await exists(messagesPath);

    if (
      hasMessagesJson &&
      isUUID(entry.name) &&
      !validChatGroupIds.has(entry.name)
    ) {
      try {
        await remove([chatsDir, entry.name].join(sep()), { recursive: true });
      } catch (e) {
        console.error(
          `[ChatPersister] Failed to remove orphan dir ${entry.name}:`,
          e,
        );
      }
    }
  }
}

export function createChatPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createModeAwarePersister(store, {
    label: "ChatPersister",
    mode: config.mode,
    load: async () => undefined,
    save: async () => {
      const tables = store.getTables() as TablesContent | undefined;
      const dataDir = await getDataDir();
      const { dirs, operations, validChatGroupIds } = collectChatWriteOps(
        tables,
        dataDir,
      );
      await writeJsonFiles(operations, dirs);
      await cleanupOrphanChatDirs(dataDir, validChatGroupIds);
    },
  });
}
