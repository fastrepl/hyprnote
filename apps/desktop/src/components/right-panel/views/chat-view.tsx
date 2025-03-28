import { useChat } from "@/hooks";
import { useState } from "react";
import {
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  ChatSession,
  EmptyChatState,
  FloatingActionButtons,
} from "../components/chat";

export function ChatView() {
  const {
    messages,
    inputValue,
    showHistory,
    searchValue,
    activeEntity,
    chatSourceEntity,
    hasActiveChat,
    handleInputChange,
    handleSubmit,
    handleKeyDown,
    handleQuickAction,
    handleFocusInput,
    handleNewChat,
    handleViewHistory,
    handleSearchChange,
    handleSelectChat,
    handleBackToChat,
    handleNoteBadgeClick,
    formatDate,
  } = useChat();

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

  if (hasActiveChat) {
    return (
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <FloatingActionButtons
          onNewChat={handleNewChat}
          onViewHistory={handleViewHistory}
        />

        <ChatMessagesView messages={messages} />

        <ChatInput
          inputValue={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          autoFocus={true}
          noteTitle={chatSourceEntity ? chatSourceEntity.name : activeEntity?.name}
          badgeType={chatSourceEntity ? chatSourceEntity.type : activeEntity?.type}
          onNoteBadgeClick={handleNoteBadgeClick}
        />
      </div>
    );
  }

  if (activeEntity) {
    return (
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <FloatingActionButtons
          onNewChat={handleNewChat}
          onViewHistory={handleViewHistory}
        />

        <EmptyChatState
          onQuickAction={handleQuickAction}
          onFocusInput={handleFocusInput}
        />

        <ChatInput
          inputValue={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          autoFocus={true}
          noteTitle={activeEntity.name}
          badgeType={activeEntity.type}
          onNoteBadgeClick={handleNoteBadgeClick}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <FloatingActionButtons
        onNewChat={handleNewChat}
        onViewHistory={handleViewHistory}
      />

      <EmptyChatState
        onQuickAction={handleQuickAction}
        onFocusInput={handleFocusInput}
      />

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        onNoteBadgeClick={handleNoteBadgeClick}
      />
    </div>
  );
}
