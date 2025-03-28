import { commands as dbCommands } from "@hypr/plugin-db";
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
import { ActiveEntityInfo } from "./types";
import { getMockChatHistory } from "./utils";

interface EntityChatViewProps {
  entityId: string;
  entityType: BadgeType;
}

export function EntityChatView({ entityId, entityType }: EntityChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [chatSourceEntity, setChatSourceEntity] = useState<ActiveEntityInfo | null>(null);

  const hasActiveChat = messages.length > 0;

  const previousEntityRef = useRef<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const updateActiveEntity = async () => {
      let newEntity: ActiveEntityInfo | null = null;

      try {
        if (entityType === "human") {
          const human = await dbCommands.getHuman(entityId);
          if (human) {
            newEntity = {
              id: entityId,
              name: human.full_name || "Unknown Contact",
              type: "human",
            };
          }
        } else if (entityType === "organization") {
          const organization = await dbCommands.getOrganization(entityId);
          if (organization) {
            newEntity = {
              id: entityId,
              name: organization.name || "Unknown Organization",
              type: "organization",
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching ${entityType} data:`, error);
      }

      if (newEntity) {
        previousEntityRef.current = newEntity.id;
        setActiveEntity(newEntity);

        if (messages.length === 0 && !chatSourceEntity) {
          setChatSourceEntity(newEntity);
        }
      }
    };

    updateActiveEntity();
  }, [entityId, entityType, messages.length, chatSourceEntity]);

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
