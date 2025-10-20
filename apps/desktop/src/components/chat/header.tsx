import { formatDistanceToNow } from "@hypr/utils";
import { ChevronDown, MessageCircle, PanelRightIcon, PictureInPicture2Icon, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/utils";
import { useShell } from "../../contexts/shell";
import * as persisted from "../../store/tinybase/persisted";

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
  const { chat } = useShell();

  return (
    <div
      data-tauri-drag-region={chat.mode === "RightPanelOpen"}
      className={cn([
        "flex items-center justify-between px-1 py-0.5 border-b border-neutral-200 h-9",
        chat.mode === "RightPanelOpen" && "border rounded-md",
      ])}
    >
      <div className="flex items-center">
        <ChatGroups currentChatGroupId={currentChatGroupId} onSelectChat={onSelectChat} />
        <ChatActionButton
          icon={<Plus size={16} />}
          onClick={onNewChat}
          title="New chat"
        />
      </div>

      <div className="flex items-center">
        <ChatActionButton
          icon={chat.mode === "RightPanelOpen"
            ? <PictureInPicture2Icon className="w-4 h-4" />
            : <PanelRightIcon className="w-4 h-4" />}
          onClick={() => chat.sendEvent({ type: "SHIFT" })}
          title="Toggle"
        />
        <ChatActionButton
          icon={<X size={16} />}
          onClick={handleClose}
          title="Close"
        />
      </div>
    </div>
  );
}

function ChatActionButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      title={title}
      size="icon"
      variant="ghost"
    >
      {icon}
    </Button>
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
    5,
    persisted.STORE_ID,
  );

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-auto px-2 py-1.5 group"
        >
          <MessageCircle className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
          <h3 className="font-medium text-neutral-700 text-xs truncate">
            {currentChatTitle || "Ask Hyprnote anything"}
          </h3>
          <ChevronDown
            className={cn([
              "w-3.5 h-3.5 text-neutral-400 transition-transform duration-200",
              isDropdownOpen && "rotate-180",
            ])}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <div className="space-y-0.5">
          <div className="px-2 py-1.5">
            <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Recent Chats</h4>
          </div>
          {recentChatGroupIds.length > 0
            ? (
              <div className="space-y-0.5">
                {recentChatGroupIds.map((groupId) => (
                  <ChatGroupItem
                    key={groupId}
                    groupId={groupId}
                    isActive={groupId === currentChatGroupId}
                    onSelect={(id) => {
                      onSelectChat(id);
                      setIsDropdownOpen(false);
                    }}
                  />
                ))}
              </div>
            )
            : (
              <div className="px-3 py-6 text-center">
                <MessageCircle className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
                <p className="text-xs text-neutral-400">No recent chats</p>
              </div>
            )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatGroupItem({
  groupId,
  isActive,
  onSelect,
}: {
  groupId: string;
  isActive: boolean;
  onSelect: (groupId: string) => void;
}) {
  const chatGroup = persisted.UI.useRow("chat_groups", groupId, persisted.STORE_ID);

  if (!chatGroup) {
    return null;
  }

  const formattedTime = chatGroup.created_at
    ? formatDistanceToNow(new Date(chatGroup.created_at), { addSuffix: true })
    : "";

  return (
    <Button
      variant="ghost"
      onClick={() => onSelect(groupId)}
      className={cn([
        "w-full justify-start h-auto px-2.5 py-1.5 group",
        isActive ? "bg-neutral-100 shadow-sm hover:bg-neutral-100" : "hover:bg-neutral-50 active:bg-neutral-100",
      ])}
    >
      <div className="flex items-center gap-2.5 w-full">
        <div className="flex-shrink-0">
          <MessageCircle
            className={cn([
              "w-3.5 h-3.5 transition-colors",
              isActive ? "text-neutral-700" : "text-neutral-400 group-hover:text-neutral-600",
            ])}
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div
            className={cn([
              "text-sm font-medium truncate",
              isActive ? "text-neutral-900" : "text-neutral-700",
            ])}
          >
            {chatGroup.title}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {formattedTime}
          </div>
        </div>
      </div>
    </Button>
  );
}
