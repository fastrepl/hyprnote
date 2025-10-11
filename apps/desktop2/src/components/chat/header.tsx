import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ExternalLink, MessageCircle, Plus, X } from "lucide-react";
import { useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@hypr/ui/components/ui/dropdown-menu";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

export function ChatHeader({
  currentChatGroupId,
  onNewChat,
  onSelectChat,
  handleClose,
}: {
  currentChatGroupId: string | undefined;
  onNewChat: () => void;
  onSelectChat: (chatGroupId: string) => void;
  handleClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200">
      <ChatGroups currentChatGroupId={currentChatGroupId} onSelectChat={onSelectChat} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => windowsCommands.windowShow({ type: "chat", value: id() })}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors"
          title="Pop out chat"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
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
function ChatGroups({
  currentChatGroupId,
  onSelectChat,
}: {
  currentChatGroupId: string | undefined;
  onSelectChat: (chatGroupId: string) => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentChatTitle = persisted.UI.useCell(
    "chat_groups",
    currentChatGroupId || "",
    "title",
    persisted.STORE_ID,
  );
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
                onSelect={(id) => {
                  onSelectChat(id);
                  setIsDropdownOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatGroupItem({ groupId, onSelect }: { groupId: string; onSelect: (groupId: string) => void }) {
  const chatGroup = persisted.UI.useRow("chat_groups", groupId, persisted.STORE_ID);

  if (!chatGroup) {
    return null;
  }

  return (
    <button
      onClick={() => onSelect(groupId)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-900 truncate">{chatGroup.title}</span>
        <span className="text-xs text-neutral-400">{formatDistanceToNow(new Date(chatGroup.created_at ?? ""))}</span>
        <MessageCircle className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 ml-2" />
      </div>
    </button>
  );
}
