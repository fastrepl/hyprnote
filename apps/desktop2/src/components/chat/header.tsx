import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, MessageCircle, Plus, X } from "lucide-react";
import { useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@hypr/ui/components/ui/dropdown-menu";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

export function ChatHeader({
  currentChatId,
  handleClose,
}: {
  currentChatId: string;
  handleClose: () => void;
}) {
  const handleNewChat = () => {
    console.log("New chat");
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200">
      <ChatGroups currentChatId={currentChatId} />

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
function ChatGroups({ currentChatId }: { currentChatId: string }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentChatTitle = persisted.UI.useCell("chat_groups", currentChatId, "title", persisted.STORE_ID);
  const recentChatGroupIds = persisted.UI.useSortedRowIds(
    "chat_groups",
    "created_at",
    true,
    0,
    3,
    persisted.STORE_ID,
  );

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-neutral-50 px-2 py-1 rounded-lg transition-colors">
          <h3 className="font-semibold text-neutral-900">{currentChatTitle || "Ask Hyprnote anything"}</h3>
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-3">
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
      </DropdownMenuContent>
    </DropdownMenu>
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
