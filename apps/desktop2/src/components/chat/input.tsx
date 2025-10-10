import { SendIcon } from "lucide-react";

import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

export function ChatMessageInput({ handleAddMessage }: { handleAddMessage: (message: persisted.ChatMessage) => void }) {
  return (
    <form
      className="p-4 border-t border-neutral-200 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleAddMessage({
          user_id: id(),
          chat_group_id: id(),
          content: "Hello, world!",
          created_at: new Date().toISOString(),
          role: "user",
          parts: [{ type: "text", text: "Hello, world!" }],
          metadata: {},
        });
      }}
    >
      <input
        type="text"
        placeholder="Ask & search about anything, or be creative!"
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
      >
        <SendIcon className="size-4" />
      </button>
    </form>
  );
}
