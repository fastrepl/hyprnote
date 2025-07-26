import { ClockIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

interface FloatingActionButtonsProps {
  onNewChat: () => void;
  onViewHistory: () => void;
  chatGroups?: Array<{ id: string; created_at: string; firstMessage?: string }>;
  onSelectChatGroup?: (groupId: string) => void;
}

export function FloatingActionButtons(
  { onNewChat, onViewHistory, chatGroups, onSelectChatGroup }: FloatingActionButtonsProps,
) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-10 flex group border rounded-lg overflow-clip divide-x bg-background/40 transition-colors">
      <Button
        variant="ghost"
        size="icon"
        className="opacity-20 group-hover:opacity-100 transition-opacity rounded-none hover:bg-white"
        onClick={onNewChat}
      >
        <PlusIcon className="h-4 w-4" />
      </Button>

      {chatGroups && chatGroups.length > 0 && onSelectChatGroup && (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-20 group-hover:opacity-100 transition-opacity rounded-none hover:bg-white"
            >
              <ClockIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {chatGroups.map((group, index) => (
              <DropdownMenuItem
                key={group.id}
                onClick={() => {
                  onSelectChatGroup(group.id);
                  setIsDropdownOpen(false);
                }}
              >
                {group.firstMessage
                  ? (group.firstMessage.length > 25
                    ? group.firstMessage.substring(0, 25) + "..."
                    : group.firstMessage)
                  : `Chat Group ${index + 1}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
