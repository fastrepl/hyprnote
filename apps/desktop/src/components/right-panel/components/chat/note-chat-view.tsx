import { useSession } from "@/contexts";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BadgeType,
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  EmptyChatState,
  FloatingActionButtons,
  Message,
} from "../../components/chat";

import { ActiveEntityInfo, ActiveNoteInfo } from "./types";
import { getMockChatHistory } from "./utils";

interface NoteChatViewProps {
  noteId: string;
}

export function NoteChatView({ noteId }: NoteChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [activeNote, setActiveNote] = useState<ActiveNoteInfo | null>(null);
  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [chatSourceEntity, setChatSourceEntity] = useState<ActiveEntityInfo | null>(null);

  const hasActiveChat = messages.length > 0;

  const previousEntityRef = useRef<string | null>(null);

  const navigate = useNavigate();

  const sessionData = useSession(noteId, (s) => ({
    session: s.session,
  }));

  useEffect(() => {
    const updateActiveEntity = async () => {
      const noteTitle = sessionData?.session?.title || "Untitled";

      setActiveNote(prev =>
        prev?.id === noteId ? prev : {
          id: noteId,
          title: noteTitle,
        }
      );

      const newEntity = {
        id: noteId,
        name: noteTitle,
        type: "note" as BadgeType,
      };

      previousEntityRef.current = newEntity.id;
      setActiveEntity(newEntity);

      if (messages.length === 0 && !chatSourceEntity) {
        setChatSourceEntity(newEntity);
      }
    };

    updateActiveEntity();
  }, [noteId, sessionData?.session?.title, messages.length, chatSourceEntity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (messages.length === 0 && activeEntity && !chatSourceEntity) {
      setChatSourceEntity(activeEntity);
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

    document.querySelector("textarea")?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (messages.length === 0 && activeEntity && !chatSourceEntity) {
      setChatSourceEntity(activeEntity);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a sample response to your quick action.",
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
    setChatSourceEntity(null);
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

  const handleNoteBadgeClick = () => {
    if (chatSourceEntity) {
      if (chatSourceEntity.type === "note") {
        navigate({ to: `/app/note/$id`, params: { id: chatSourceEntity.id } });
      } else if (chatSourceEntity.type === "human") {
        navigate({ to: `/app/human/$id`, params: { id: chatSourceEntity.id } });
      } else if (chatSourceEntity.type === "organization") {
        navigate({ to: `/app/organization/$id`, params: { id: chatSourceEntity.id } });
      }
    } else if (activeEntity) {
      if (activeEntity.type === "note") {
        navigate({ to: `/app/note/$id`, params: { id: activeEntity.id } });
      } else if (activeEntity.type === "human") {
        navigate({ to: `/app/human/$id`, params: { id: activeEntity.id } });
      } else if (activeEntity.type === "organization") {
        navigate({ to: `/app/organization/$id`, params: { id: activeEntity.id } });
      }
    }
  };

  const chatHistory = getMockChatHistory();

  if (showHistory) {
    return (
      <ChatHistoryView
        chatHistory={chatHistory}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onBackToChat={handleBackToChat}
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
        noteTitle={activeEntity?.name}
        badgeType={activeEntity?.type}
        onNoteBadgeClick={handleNoteBadgeClick}
      />
    </div>
  );
}
