import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";
import { ChatHistoryItem } from "./chat-history-item";
import { ChatSession } from "./types";

interface ChatHistoryViewProps {
  chatHistory: ChatSession[];
  searchValue: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onBackToChat: () => void;
  formatDate: (date: Date) => string;
}

export function ChatHistoryView({
  chatHistory,
  searchValue,
  onSearchChange,
  onSelectChat,
  onNewChat,
  onBackToChat,
  formatDate,
}: ChatHistoryViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-2 border-b gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBackToChat}
          className="hover:bg-neutral-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">All chats</div>
      </div>

      <div className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search or start new chat"
            className="pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <div className="text-sm text-muted-foreground">Past 30 days</div>
        </div>

        {chatHistory
          .filter(chat => {
            // Filter by search term if one exists
            if (!searchValue) return true;
            return chat.title.toLowerCase().includes(searchValue.toLowerCase());
          })
          .map((chat, index) => {
            // Check if this chat should have a divider after it
            const chatDate = new Date(chat.lastMessageDate);
            const nextChat = chatHistory[index + 1];
            const isLastInSection = !nextChat
              || (chatDate.getTime() - nextChat.lastMessageDate.getTime() > 30 * 24 * 60 * 60 * 1000);

            return (
              <div key={chat.id}>
                <ChatHistoryItem
                  chat={chat}
                  onSelect={onSelectChat}
                  formatDate={formatDate}
                />

                {isLastInSection && index < chatHistory.length - 1 && (
                  <div className="px-4 py-2">
                    <div className="text-sm text-muted-foreground">Older</div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
