import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, MessageCircle, Plus, SendIcon, X } from "lucide-react";
import { useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/ui/lib/utils";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

export function ChatBody({
  currentChatId,
  isOpen,
  handleClose,
  handleAddMessage,
}: {
  currentChatId: string;
  isOpen: boolean;
  handleClose: () => void;
  handleAddMessage: (message: persisted.ChatMessage) => void;
}) {
  const chatRef = useAutoCloser(handleClose, isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={chatRef}
      className={cn(
        "fixed bottom-4 right-4 z-40",
        "w-[440px] h-[600px] max-h-[calc(100vh-120px)]",
        "bg-white rounded-2xl shadow-2xl",
        "border border-neutral-200",
        "flex flex-col",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
      )}
    >
      <ChatHeader currentChatId={currentChatId} handleClose={handleClose} />

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <MessageCircle className="w-12 h-12 text-neutral-300 mb-3" />
          <p className="text-neutral-600 text-sm mb-2">
            Ask the AI assistant about anything.
          </p>
          <p className="text-neutral-400 text-xs">
            It can also do few cool stuff for you.
          </p>
        </div>
      </div>

      <ChatMessageInput handleAddMessage={handleAddMessage} />
    </div>
  );
}

function ChatHeader({
  currentChatId,
  handleClose,
}: {
  currentChatId: string;
  handleClose: () => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentChatTitle = persisted.UI.useCell("chat_groups", currentChatId, "title", persisted.STORE_ID);

  const handleNewChat = () => {
    console.log("New chat");
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:bg-neutral-50 px-2 py-1 rounded-lg transition-colors">
            <h3 className="font-semibold text-neutral-900">{currentChatTitle || "Ask Hyprnote anything"}</h3>
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-3">
          <ChatGroups />
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1">
        <button
          onClick={() => windowsCommands.windowShow({ type: "chat", value: id() })}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors"
          title="Pop out chat"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={handleNewChat}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ChatMessageInput({ handleAddMessage }: { handleAddMessage: (message: persisted.ChatMessage) => void }) {
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

function ChatGroups() {
  const recentChatGroupIds = persisted.UI.useSortedRowIds(
    "chat_groups",
    "created_at",
    true,
    0,
    3,
    persisted.STORE_ID,
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-neutral-700 px-1">Recent Chats</h3>
      <div className="space-y-1">
        {recentChatGroupIds.map((groupId) => (
          <ChatGroupItem
            key={groupId}
            groupId={groupId}
          />
        ))}
      </div>
    </div>
  );
}

function ChatGroupItem({ groupId }: { groupId: string }) {
  const chatGroup = persisted.UI.useRow("chat_groups", groupId, persisted.STORE_ID);

  if (!chatGroup) {
    return null;
  }

  return (
    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-900 truncate">{chatGroup.title}</span>
        <span className="text-xs text-neutral-400">{formatDistanceToNow(new Date(chatGroup.created_at ?? ""))}</span>
        <MessageCircle className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 ml-2" />
      </div>
    </button>
  );
}
