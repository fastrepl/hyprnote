import { useEffect, useState } from "react";

import {
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  ChatSession,
  EmptyChatState,
  FloatingActionButtons,
  Message,
} from "../components/chat";

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1625);
      return () => clearTimeout(timeout);
    }, 4625);

    return () => clearInterval(animationInterval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

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
    setInputValue(prompt);

    document.querySelector("textarea")?.focus();
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue("");
    setShowHistory(false);
  };

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelectChat = (chatId: string) => {
    console.log(`Selected chat: ${chatId}`);
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
    <div className="flex flex-col h-full relative">
      <FloatingActionButtons
        onNewChat={handleNewChat}
        onViewHistory={handleViewHistory}
      />

      {messages.length === 0
        ? (
          <EmptyChatState
            isAnimating={isAnimating}
            onQuickAction={handleQuickAction}
          />
        )
        : <ChatMessagesView messages={messages} />}

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
