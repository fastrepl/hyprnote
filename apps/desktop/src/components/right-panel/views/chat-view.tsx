import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import {
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  ChatSession,
  EmptyChatState,
  FloatingActionButtons,
} from "../components/chat";

import { useActiveEntity } from "../hooks/useActiveEntity";
import { useChat2 } from "../hooks/useChat2";
import { useChatQueries2 } from "../hooks/useChatQueries2";
import { focusInput, formatDate } from "../utils/chat-utils";

export function ChatView() {
  const navigate = useNavigate();
  const { isExpanded, chatInputRef } = useRightPanel();
  const { userId } = useHypr();

  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

  const { activeEntity, sessionId } = useActiveEntity({
    setMessages: () => {}, // Messages managed by useChat2
    setInputValue,
    setShowHistory,
    setHasChatStarted: () => {}, // Not needed with useChat2
  });


  // First load conversations and session data
  const {
    conversations,
    sessionData,
    getOrCreateConversationId,
  } = useChatQueries2({
    sessionId,
    userId,
    currentConversationId,
    setCurrentConversationId,
    setMessages: () => {}, // Managed by useChat2
    isGenerating: false
  });

  // Then initialize chat with proper transport
  const {
    messages,
    stop,
    setMessages,
    isGenerating,
    sendMessage,
    status,
  } = useChat2({
    sessionId,
    userId,
    conversationId: currentConversationId,
    sessionData: sessionData,
    selectionData: null,
    sessions: null,
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (currentConversationId) {
        try {
          const { commands } = await import("@hypr/plugin-db");
          const dbMessages = await commands.listMessagesV2(currentConversationId);
          
          // Convert to UIMessage format
          const uiMessages = dbMessages.map(msg => ({
            id: msg.id,
            role: msg.role as "user" | "assistant" | "system",
            parts: JSON.parse(msg.parts),
            metadata: msg.metadata ? JSON.parse(msg.metadata) : {},
          }));
          
          // Use setMessages to load historical messages
          setMessages(uiMessages);
          console.log("Loaded messages from DB:", uiMessages);
        } catch (error) {
          console.error("Failed to load messages:", error);
        }
      } else {
        // Clear messages for new conversation
        setMessages([]);
        console.log("Cleared messages for new conversation");
      }
    };
    
    loadMessages();
  }, [currentConversationId, setMessages]);


  // Handle submit with conversation creation
  const handleSubmit = async (
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
    selectionData?: any,
    htmlContent?: string
  ) => {
    if (!inputValue.trim()) return;

    // Get or create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = await getOrCreateConversationId();
      if (!convId) {
        console.error("Failed to create conversation");
        return;
      }
      // Update state
      setCurrentConversationId(convId);
    }

    // Send message with the conversation ID directly (don't rely on state update)
    sendMessage(inputValue, {
      mentionedContent,
      selectionData,
      htmlContent,
      conversationId: convId, // Pass the ID directly!
    });

    setInputValue("");
  };

  const handleStop = () => {
    stop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    focusInput(chatInputRef);
  };

  const handleApplyMarkdown = async (content: string) => {
    // TODO: Implement proper markdown apply functionality
    console.log("Apply markdown to note:", content);
    // This would update the session's enhanced_memo_html field
    // Need backend support for this
  };

  // Derive precise status flags from useChat status
  const isSubmitted = status === "submitted"; // Request sent, waiting for response
  const isStreaming = status === "streaming"; // Actively receiving response
  const isReady = status === "ready"; 


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleFocusInput = () => {
    focusInput(chatInputRef);
  };

  const handleNewChat = () => {
    // Only allow new chat if we have existing messages
    if (!messages || messages.length === 0) {
      console.log("Already in empty state, not creating new chat");
      return;
    }
    
    if (!sessionId || !userId) {
      return;
    }

    // Reset to empty state - conversation will be created on first message
    setCurrentConversationId(null);
    setInputValue("");
    // Clear messages properly with setMessages
    setMessages([]);
  };

  const handleSelectChatGroup = async (groupId: string) => {
    setCurrentConversationId(groupId);
  };

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelectChat = (_chatId: string) => {
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
        chatGroups={conversations}
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
            sessionTitle={sessionData?.title || "Untitled"}
            hasEnhancedNote={!!(sessionData?.enhancedContent)}
            onApplyMarkdown={handleApplyMarkdown}
            isSubmitted={isSubmitted}
            isStreaming={isStreaming}
            isReady={isReady}
          />
        )}

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={(mentionedContent, selectionData, htmlContent) =>
          handleSubmit(mentionedContent, selectionData, htmlContent)}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        entityId={activeEntity?.id}
        entityType={activeEntity?.type}
        onNoteBadgeClick={handleNoteBadgeClick}
        isGenerating={isGenerating}
        onStop={handleStop}
      />
    </div>
  );
}
