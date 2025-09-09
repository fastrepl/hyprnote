import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { showProGateModal } from "@/components/pro-gate-modal/service";
import { useHypr, useRightPanel } from "@/contexts";
import { useLicense } from "@/hooks/use-license";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { useSessions } from "@hypr/utils/contexts";
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
  const { isExpanded, chatInputRef, pendingSelection } = useRightPanel();
  const { userId } = useHypr();
  const { getLicense } = useLicense();

  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

  const { activeEntity, sessionId } = useActiveEntity({
    setMessages: () => {},
    setInputValue,
    setShowHistory,
    setHasChatStarted: () => {},
  });

  const sessions = useSessions((s) => s.sessions);

  const {
    conversations,
    sessionData,
    createConversation,
    getOrCreateConversationId,
  } = useChatQueries2({
    sessionId,
    userId,
    currentConversationId,
    setCurrentConversationId,
    setMessages: () => {},
    isGenerating: false,
  });

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
    selectionData: pendingSelection,
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  useEffect(() => {
    const loadMessages = async () => {
      if (currentConversationId) {
        try {
          const { commands } = await import("@hypr/plugin-db");
          const dbMessages = await commands.listMessagesV2(currentConversationId);

          const uiMessages = dbMessages.map(msg => ({
            id: msg.id,
            role: msg.role as "user" | "assistant" | "system",
            parts: JSON.parse(msg.parts),
            metadata: msg.metadata ? JSON.parse(msg.metadata) : {},
          }));

          setMessages(uiMessages);
        } catch (error) {
          console.error("Failed to load messages:", error);
        }
      } else {
        setMessages([]);
      }
    };

    loadMessages();
  }, [currentConversationId, setMessages]);

  const handleSubmit = async (
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
    selectionData?: any,
    htmlContent?: string,
  ) => {
    if (!inputValue.trim()) {
      return;
    }

    const userMessageCount = messages.filter((m: any) => m.role === "user").length;
    if (userMessageCount >= 4 && !getLicense.data?.valid) {
      await analyticsCommands.event({
        event: "pro_license_required_chat",
        distinct_id: userId,
      });
      await showProGateModal("chat");
      return;
    }

    analyticsCommands.event({
      event: "chat_message_sent",
      distinct_id: userId,
    });

    let convId = currentConversationId;
    if (!convId) {
      convId = await getOrCreateConversationId();
      if (!convId) {
        console.error("Failed to create conversation");
        return;
      }
      setCurrentConversationId(convId);
    }

    sendMessage(inputValue, {
      mentionedContent,
      selectionData,
      htmlContent,
      conversationId: convId,
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

  const handleQuickAction = async (action: string) => {
    const convId = await createConversation();
    if (!convId) {
      console.error("Failed to create conversation");
      return;
    }

    setCurrentConversationId(convId);

    sendMessage(action, {
      conversationId: convId,
    });
  };

  const handleApplyMarkdown = async (markdownContent: string) => {
    if (!sessionId) {
      console.error("No session ID available");
      return;
    }

    const sessionStore = sessions[sessionId];
    if (!sessionStore) {
      console.error("Session not found in store");
      return;
    }

    try {
      const html = await miscCommands.opinionatedMdToHtml(markdownContent);

      const { showRaw, updateRawNote, updateEnhancedNote } = sessionStore.getState();

      if (showRaw) {
        updateRawNote(html);
      } else {
        updateEnhancedNote(html);
      }
    } catch (error) {
      console.error("Failed to apply markdown content:", error);
    }
  };

  const isSubmitted = status === "submitted";
  const isStreaming = status === "streaming";
  const isReady = status === "ready";
  const isError = status === "error";

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleFocusInput = () => {
    focusInput(chatInputRef);
  };

  const handleNewChat = () => {
    if (!messages || messages.length === 0) {
      return;
    }

    if (!sessionId || !userId) {
      return;
    }

    if (isGenerating) {
      return;
    }

    setCurrentConversationId(null);
    setInputValue("");
    setMessages([]);
  };

  const handleSelectChatGroup = async (groupId: string) => {
    if (isGenerating) {
      return;
    }
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
            isError={isError}
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
