import * as memory from "../tinybase/store/memory";
import * as persisted from "../tinybase/store/persisted";

export function Chat() {
  const currentChatGroupId = memory.UI.useValue("current_chat_group_id", memory.STORE_ID);
  const chatGroupIds = persisted.UI.useSortedRowIds("chat_groups", "created_at", false, 0, 5, persisted.STORE_ID);

  const setCurrentChatGroupId = memory.UI.useSetValueCallback(
    "current_chat_group_id",
    (e: string) => e,
    [],
    memory.STORE_ID,
  );

  const messageIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.chatMessagesByGroup,
    String(currentChatGroupId ?? ""),
    persisted.STORE_ID,
  );

  if (!currentChatGroupId) {
    return (
      <div className="border border-gray-300 rounded p-2">
        <div className="text-gray-500">Select or create a chat group</div>

        <div className="flex flex-row gap-2">
          {chatGroupIds?.map((chatGroupId) => (
            <button
              key={chatGroupId}
              className="bg-neutral-700 hover:bg-neutral-800 text-white px-4 py-2 rounded-md"
              onClick={() => setCurrentChatGroupId(chatGroupId)}
            >
              {chatGroupId}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded p-2">
      <button onClick={() => setCurrentChatGroupId("")}>
        reset
      </button>

      <div className="space-y-2">
        {messageIds?.map((messageId) => <ChatMessage key={messageId} messageId={messageId} />)}
      </div>
    </div>
  );
}

function ChatMessage({ messageId }: { messageId: string }) {
  const message = persisted.UI.useRow("chat_messages", messageId, persisted.STORE_ID);

  return (
    <div className="p-2 rounded bg-gray-50">
      <div className="text-xs text-gray-500 mb-1">{message?.role}</div>
      <div>{message?.content}</div>
    </div>
  );
}
