import { useEffect, useState } from "react";

import { useRightPanel } from "@/contexts";
import { useMatch, useNavigate } from "@tanstack/react-router";
import {
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  ChatSession,
  EmptyChatState,
  FloatingActionButtons,
  Message,
} from "../components/chat";

interface ActiveEntityInfo {
  id: string;
  type: BadgeType;
}

export type BadgeType = "note" | "human" | "organization";

export function ChatView() {
  const navigate = useNavigate();
  const { isExpanded } = useRightPanel();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);

  const [chatHistory] = useState<ChatSession[]>([
    {
      id: "1",
      title: "New chat",
      lastMessageDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      messages: [],
    },
    {
      id: "2",
      title: "New chat",
      lastMessageDate: new Date(2025, 1, 13),
      messages: [],
    },
    {
      id: "3",
      title: "Summarize Hyprnote AI",
      lastMessageDate: new Date(2025, 1, 5),
      messages: [],
    },
    {
      id: "4",
      title: "New chat",
      lastMessageDate: new Date(2025, 1, 5),
      messages: [],
    },
    {
      id: "5",
      title: "New chat",
      lastMessageDate: new Date(2025, 1, 5),
      messages: [],
    },
    {
      id: "6",
      title: "New chat",
      lastMessageDate: new Date(2025, 0, 3),
      messages: [],
    },
    {
      id: "7",
      title: "New chat",
      lastMessageDate: new Date(2024, 11, 31),
      messages: [],
    },
  ]);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });

  useEffect(() => {
    if (!hasChatStarted) {
      if (noteMatch) {
        const noteId = noteMatch.params.id;
        setActiveEntity({
          id: noteId,
          type: "note",
        });
      } else if (humanMatch) {
        const humanId = humanMatch.params.id;
        setActiveEntity({
          id: humanId,
          type: "human",
        });
      } else if (organizationMatch) {
        const orgId = organizationMatch.params.id;
        setActiveEntity({
          id: orgId,
          type: "organization",
        });
      } else {
        setActiveEntity(null);
      }
    }
  }, [noteMatch, humanMatch, organizationMatch, hasChatStarted]);

  useEffect(() => {
    if (isExpanded) {
      const focusTimeout = setTimeout(() => {
        const chatInput = document.querySelector(".right-panel-container textarea");
        if (chatInput) {
          (chatInput as HTMLTextAreaElement).focus();
        }
      }, 200);

      return () => clearTimeout(focusTimeout);
    }
  }, [isExpanded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      return;
    }

    if (!hasChatStarted && activeEntity) {
      setHasChatStarted(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a sample response from the AI assistant.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a sample response from the AI assistant.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);

    document.querySelector("textarea")?.focus();
  };

  const handleFocusInput = () => {
    document.querySelector("textarea")?.focus();
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue("");
    setShowHistory(false);
    setHasChatStarted(false);
  };

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelectChat = (chatId: string) => {
    setShowHistory(false);
  };

  const handleBackToChat = () => {
    setShowHistory(false);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      if (weeks > 0) {
        return `${weeks}w`;
      }

      return `${diffDays}d`;
    } else {
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();

      if (date.getFullYear() === now.getFullYear()) {
        return `${month} ${day}`;
      }

      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
  };

  const handleNoteBadgeClick = () => {
    if (activeEntity) {
      navigate({ to: `/app/${activeEntity.type}/$id`, params: { id: activeEntity.id } });
    }
  };

  if (showHistory) {
    return (
      <ChatHistoryView
        chatHistory={chatHistory}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onBackToChat={handleBackToChat}
        formatDate={formatDate}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden h-full">
      <FloatingActionButtons
        onNewChat={handleNewChat}
        onViewHistory={handleViewHistory}
      />

      {messages.length === 0
        ? (
          <EmptyChatState
            onQuickAction={handleQuickAction}
            onFocusInput={handleFocusInput}
          />
        )
        : <ChatMessagesView messages={messages} />}

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        entityId={activeEntity?.id}
        entityType={activeEntity?.type}
        onNoteBadgeClick={handleNoteBadgeClick}
      />
    </div>
  );
}
