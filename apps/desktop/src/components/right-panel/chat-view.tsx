import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { showProGateModal } from "@/components/pro-gate-modal/service";
import { useHypr } from "@/contexts";
import { useLicense } from "@/hooks/use-license";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { ChatHistoryView } from "@hypr/ui/components/chat/chat-history-view";
import { ChatInput } from "@hypr/ui/components/chat/chat-input";
import { ChatMessagesView } from "@hypr/ui/components/chat/chat-messages-view";
import { FloatingActionButtons } from "@hypr/ui/components/chat/floating-action-buttons";
import { useRightPanel, useSessions } from "@hypr/utils/contexts";
import { ChatSession, EmptyChatState } from "./components/chat";

import { useActiveEntity } from "./hooks/useActiveEntity";
import { useChat2 } from "./hooks/useChat2";
import { useChatInput } from "./hooks/useChatInput";
import { useChatQueries2 } from "./hooks/useChatQueries2";
import { focusInput, formatDate } from "./utils/chat-utils";

export function ChatView() {
  return ChatViewInner();
}

function ChatViewInner() {
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

  const convertMarkdownToHtml = useCallback(async (markdown: string) => {
    return await miscCommands.opinionatedMdToHtml(markdown);
  }, []);

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

  const handleChooseModel = () => {
    windowsCommands.windowShow({ type: "settings" }).then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab: "ai-llm" },
        });
      }, 800);
    });
  };

  useEffect(() => {
    if (isExpanded) {
      const focusTimeout = setTimeout(() => {
        focusInput(chatInputRef);
      }, 200);

      return () => clearTimeout(focusTimeout);
    }
  }, [isExpanded, chatInputRef]);

  // Use the chat input hook to get all the props for ChatInput
  const chatInputProps = useChatInput({
    entityId: activeEntity?.id,
    entityType: activeEntity?.type,
    onSubmit: handleSubmit,
  });

  if (showHistory) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Reserved space for floating buttons */}
        <div className="h-16 flex-shrink-0 relative">
          <FloatingActionButtons
            onNewChat={handleNewChat}
            onViewHistory={handleViewHistory}
            chatGroups={conversations}
            onSelectChatGroup={handleSelectChatGroup}
          />
        </div>

        {/* Chat content starts below reserved space */}
        <div className="flex-1 overflow-hidden">
          <ChatHistoryView
            chatHistory={chatHistory}
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onBackToChat={handleBackToChat}
            formatDate={formatDate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Reserved space for floating buttons */}
      <div className="h-14 flex-shrink-0 relative">
        <FloatingActionButtons
          onNewChat={handleNewChat}
          onViewHistory={handleViewHistory}
          chatGroups={conversations}
          onSelectChatGroup={handleSelectChatGroup}
        />
      </div>

      {/* Chat content starts below reserved space */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0
          ? (
            <EmptyChatState
              onQuickAction={handleQuickAction}
              onFocusInput={handleFocusInput}
              sessionId={sessionId}
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
              convertMarkdownToHtml={convertMarkdownToHtml}
            />
          )}

        <ChatInput
          inputValue={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          autoFocus={true}
          entityId={activeEntity?.id}
          entityType={activeEntity?.type}
          onNoteBadgeClick={handleNoteBadgeClick}
          isGenerating={isGenerating}
          onStop={handleStop}
          // Props from useChatInput hook
          isModelModalOpen={chatInputProps.isModelModalOpen}
          setIsModelModalOpen={chatInputProps.setIsModelModalOpen}
          entityTitle={chatInputProps.entityTitle}
          currentModelName={chatInputProps.currentModelName}
          pendingSelection={chatInputProps.pendingSelection}
          handleMentionSearch={chatInputProps.handleMentionSearch}
          processSelection={chatInputProps.processSelection}
          clearPendingSelection={chatInputProps.clearPendingSelection}
          chatInputRef={chatInputRef}
          onChooseModel={handleChooseModel}
        />
      </div>
    </div>
  );
}
