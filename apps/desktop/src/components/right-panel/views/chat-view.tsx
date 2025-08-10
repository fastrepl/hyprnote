import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import {
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  ChatSession,
  EmptyChatState,
  FloatingActionButtons,
} from "../components/chat";

import { useActiveEntity } from "../hooks/useActiveEntity";
import { useChatLogic } from "../hooks/useChatLogic";
import { useChatQueries } from "../hooks/useChatQueries";
import type { Message } from "../types/chat-types";
import { focusInput, formatDate } from "../utils/chat-utils";

export function ChatView() {
  const navigate = useNavigate();
  const { isExpanded, chatInputRef } = useRightPanel();
  const { userId } = useHypr();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [currentChatGroupId, setCurrentChatGroupId] = useState<string | null>(null);
  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

  const prevIsGenerating = useRef(false);

  const { activeEntity, sessionId } = useActiveEntity({
    setMessages,
    setInputValue,
    setShowHistory,
    setHasChatStarted,
  });

  const llmConnectionQuery = useQuery({
    queryKey: ["llm-connection"],
    queryFn: () => connectorCommands.getLlmConnection(),
    refetchOnWindowFocus: true,
  });

  const { chatGroupsQuery, sessionData, getChatGroupId } = useChatQueries({
    sessionId,
    userId,
    currentChatGroupId,
    setCurrentChatGroupId,
    setMessages,
    setHasChatStarted,
    prevIsGenerating,
  });

  const {
    isGenerating,
    handleSubmit,
    handleQuickAction,
    handleApplyMarkdown,
    handleKeyDown,
  } = useChatLogic({
    sessionId,
    userId,
    activeEntity,
    messages,
    inputValue,
    hasChatStarted,
    setMessages,
    setInputValue,
    setHasChatStarted,
    getChatGroupId,
    sessionData,
    chatInputRef,
    llmConnectionQuery,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleFocusInput = () => {
    focusInput(chatInputRef);
  };

  const handleNewChat = async () => {
    if (!sessionId || !userId) {
      return;
    }

    setCurrentChatGroupId(null);
    setMessages([]);
    setHasChatStarted(false);
    setInputValue("");
  };

  const handleSelectChatGroup = async (groupId: string) => {
    setCurrentChatGroupId(groupId);
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

  const handleNoteBadgeClick = () => {
    if (activeEntity) {
      navigate({ to: `/app/${activeEntity.type}/$id`, params: { id: activeEntity.id } });
    }
  };

  useEffect(() => {
    if (isExpanded) {
      const focusTimeout = setTimeout(() => {
        focusInput(chatInputRef);
      }, 200);

      return () => clearTimeout(focusTimeout);
    }
  }, [isExpanded, chatInputRef]);

  const pendingTextRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSetChatText = (event: CustomEvent) => {
      const { text } = event.detail;
      if (text && isExpanded) {
        console.log('🔥 Setting text:', text);
        
        // Set the text multiple times to fight against resets
        setInputValue(text);
        
        // Set again after a delay to fight against useActiveEntity reset
        setTimeout(() => {
          console.log('�� Setting text again (50ms):', text);
          setInputValue(text);
        }, 50);
        
        // And once more after hooks have settled
        setTimeout(() => {
          console.log('🔥 Setting text final (250ms):', text);
          setInputValue(text);
          focusInput(chatInputRef);
        }, 250);
      }
    };
    
    window.addEventListener('setChatText', handleSetChatText as EventListener);
    
    return () => {
      window.removeEventListener('setChatText', handleSetChatText as EventListener);
    };
  }, [isExpanded, chatInputRef]);

  // Apply pending text when panel becomes expanded
  useEffect(() => {
    if (isExpanded && pendingTextRef.current) {
      const pendingText = pendingTextRef.current;
      pendingTextRef.current = null;
      
      setTimeout(() => {
        setInputValue(pendingText);
        setTimeout(() => {
          focusInput(chatInputRef);
        }, 50);
      }, 300); // Wait for all panel opening effects to complete
    }
  }, [isExpanded, chatInputRef]);

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
        chatGroups={chatGroupsQuery.data}
        onSelectChatGroup={handleSelectChatGroup}
      />

      {messages.length === 0
        ? (
          <EmptyChatState
            onQuickAction={handleQuickAction}
            onFocusInput={handleFocusInput}
          />
        )
        : (
          <ChatMessagesView
            messages={messages}
            sessionTitle={sessionData.data?.title || "Untitled"}
            hasEnhancedNote={!!(sessionData.data?.enhancedContent)}
            onApplyMarkdown={handleApplyMarkdown}
          />
        )}

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={(mentionedContent) => handleSubmit(mentionedContent)}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        entityId={activeEntity?.id}
        entityType={activeEntity?.type}
        onNoteBadgeClick={handleNoteBadgeClick}
        isGenerating={isGenerating}
      />
    </div>
  );
}
