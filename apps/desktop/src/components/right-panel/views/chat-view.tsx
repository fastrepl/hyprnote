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
// ✅ Import useChat instead of streamText
import { useChat } from "@hypr/utils/ai";

interface ActiveEntityInfo {
  id: string;
  type: BadgeType;
}

export type BadgeType = "note" | "human" | "organization";

export function ChatView() {
  const navigate = useNavigate();
  const { isExpanded, chatInputRef } = useRightPanel();

  // ✅ Replace manual state with useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: handleChatSubmit,
    isLoading,
    error, // ← ADD THIS: Get error state
    setMessages: setChatMessages,
    setInput,
  } = useChat({
    // ✅ Point directly to OpenRouter API
    api: "https://openrouter.ai/api/v1/chat/completions", // ← ADD "/chat/completions"
    headers: {
      "Authorization": "Bearer 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",
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:1420", // ← ADD: OpenRouter likes this
      "X-Title": "Hyprnote Desktop", // ← ADD: OpenRouter app identification
    },
    body: {
      model: "openai/gpt-4o-mini", // ← CHANGE: Use mini for testing (cheaper)
    },
    initialMessages: [
      {
        id: "system",
        role: "system",
        content: "You are a helpful AI assistant.",
      },
    ],
    // ✅ ADD: Error handling callback
    onError: (error) => {
      console.error("useChat error:", error);
      console.error("Error details:", {
        message: error.message
      });
    },
    // ✅ ADD: Request debugging
    onResponse: (response) => {
      console.log("API Response status:", response.status);
      console.log("API Response headers:", Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        console.error("API Response not OK:", response.statusText);
      }
    },
    // ✅ ADD: Debug all requests
    onFinish: (message) => {
      console.log("Chat finished:", message);
    },
  });

  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

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
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 200);

      return () => clearTimeout(focusTimeout);
    }
  }, [isExpanded, chatInputRef]);

  // ✅ Enhanced submit with better error handling
  const handleSubmit = async () => {
    if (!input.trim()) {
      return;
    }

    if (!hasChatStarted && activeEntity) {
      setHasChatStarted(true);
    }

    console.log("Submitting message:", input); // ← ADD: Debug logging
    
    try {
      await handleChatSubmit();
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ✅ Enhanced quick action with error handling
  const handleQuickAction = async (prompt: string) => {
    console.log("Quick action:", prompt); // ← ADD: Debug logging
    
    setInput(prompt);
    // Trigger submit after setting input
    setTimeout(async () => {
      try {
        await handleChatSubmit();
      } catch (err) {
        console.error("Quick action error:", err);
      }
    }, 0);

    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleFocusInput = () => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setInput("");
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
        onNewChat={() => {
          setChatMessages([]);
          setInput("");
          setShowHistory(false);
          setHasChatStarted(false);
        }}
        onViewHistory={() => setShowHistory(true)}
      />

      {messages.length <= 1
        ? (
          <EmptyChatState
            onQuickAction={handleQuickAction}
            onFocusInput={() => chatInputRef.current?.focus()}
          />
        )
        : (
          <ChatMessagesView 
            messages={messages.slice(1).map(msg => ({
              id: msg.id,
              content: msg.content,
              isUser: msg.role === "user",
              timestamp: new Date(),
            }))} 
          />
        )}

      <ChatInput
        inputValue={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        entityId={activeEntity?.id}
        entityType={activeEntity?.type}
        onNoteBadgeClick={() => {
          if (activeEntity) {
            navigate({ to: `/app/${activeEntity.type}/$id`, params: { id: activeEntity.id } });
          }
        }}
      />
      
      {/* ✅ ADD: Loading indicator */}
      {isLoading && (
        <div className="text-sm text-blue-500 p-2 border-t">
          🤖 AI is thinking...
        </div>
      )}
      
      {/* ✅ ADD: Error display */}
      {error && (
        <div className="text-sm text-red-500 p-2 border-t bg-red-50">
          ❌ Error: {error.message}
          <details className="mt-1">
            <summary className="cursor-pointer text-xs">Debug Info</summary>
            <pre className="text-xs mt-1 overflow-auto max-h-32">
              {JSON.stringify({
                message: error.message,
                stack: error.stack,
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
