import * as memory from "../tinybase/store/memory";
import * as persisted from "../tinybase/store/persisted";
import { id } from "../utils";

export function Chat() {
  const currentChatGroupId = memory.useCurrentChatGroupId();
  const chatGroupIds = persisted.UI.useSortedRowIds("chat_groups", "created_at", false, 0, 5, persisted.STORE_ID);

  const setCurrentChatGroupId = memory.UI.useSetValueCallback(
    "current_chat_group_id",
    (e: string) => e,
    [],
    memory.STORE_ID,
  );

  const handleAddMessage = persisted.UI.useSetRowCallback(
    "chat_messages",
    id(),
    (row: persisted.ChatMessage) => ({
      ...row,
      metadata: JSON.stringify(row.metadata),
      parts: JSON.stringify(row.parts),
    } satisfies persisted.ChatMessage),
    [],
    persisted.STORE_ID,
  );

  const messageIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.chatMessagesByGroup,
    currentChatGroupId,
    persisted.STORE_ID,
  );

  if (!currentChatGroupId || !messageIds?.length) {
    return (
      <div className="border border-gray-300 rounded p-2">
        <div className="text-gray-500">Select or create a chat group</div>

        <div className="flex flex-col gap-2">
          {chatGroupIds?.map((chatGroupId) => (
            <ChatGroup
              key={chatGroupId}
              id={chatGroupId}
              handleClick={() => setCurrentChatGroupId(chatGroupId)}
            />
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const message = formData.get("message");
          if (message) {
            handleAddMessage({
              user_id: "TODO",
              chat_group_id: currentChatGroupId,
              role: "user",
              content: "TODO",
              metadata: "TODO",
              parts: JSON.stringify([]),
              created_at: new Date().toISOString(),
            });
          }
        }}
      >
        <input
          name="message"
          type="text"
          className="border border-gray-300 rounded p-2"
        />
        <button className="border border-gray-300 rounded p-2">Send</button>
      </form>
    </div>
  );
}

function ChatGroup({ id, handleClick }: { id: string; handleClick: () => void }) {
  const chatGroup = persisted.UI.useRow("chat_groups", id, persisted.STORE_ID);

  return (
    <div className="p-2 rounded bg-gray-50" onClick={handleClick}>
      <div className="text-xs text-gray-500 mb-1">{chatGroup?.title}</div>
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
