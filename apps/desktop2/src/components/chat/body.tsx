import { MessageCircle } from "lucide-react";

import * as persisted from "../../store/tinybase/persisted";

export function ChatBody({ chatGroupId }: { chatGroupId?: string }) {
  if (!chatGroupId) {
    return <ChatBodyEmpty />;
  }

  return <ChatBodyMessages chatGroupId={chatGroupId} />;
}

function ChatBodyEmpty() {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageCircle className="w-12 h-12 text-neutral-300 mb-3" />
        <p className="text-neutral-600 text-sm mb-2">Ask the AI assistant about anything.</p>
        <p className="text-neutral-400 text-xs">It can also do few cool stuff for you.</p>
      </div>
    </div>
  );
}

function ChatBodyMessages({ chatGroupId }: { chatGroupId: string }) {
  const messageIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.chatMessagesByGroup,
    chatGroupId,
    persisted.STORE_ID,
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        {messageIds.map((messageId) => <ChatBodyMessage key={messageId} messageId={messageId} />)}
      </div>
    </div>
  );
}

function ChatBodyMessage({ messageId }: { messageId: string }) {
  const message = persisted.UI.useRow("chat_messages", messageId, persisted.STORE_ID);

  if (!message) {
    return null;
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-4 py-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-neutral-100 text-neutral-900"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
