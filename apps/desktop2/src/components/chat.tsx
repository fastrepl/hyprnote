import * as persisted from "../store/tinybase/persisted";
import { id } from "../utils";

export function Chat() {
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

  return (
    <div className="h-full flex flex-col border border-gray-300 rounded">
      TODO
      <button
        onClick={() =>
          handleAddMessage({
            user_id: id(),
            chat_group_id: id(),
            content: "Hello, world!",
            created_at: new Date().toISOString(),
            role: "user",
            parts: [{ type: "text", text: "Hello, world!" }],
            metadata: {},
          })}
      >
        Add Message
      </button>
    </div>
  );
}
