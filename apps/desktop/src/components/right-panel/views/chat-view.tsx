import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands, type ChatGroup, type ChatMessage, type ChatMessageRole } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import { modelProvider, streamText } from "@hypr/utils/ai";
import { useSessions } from "@hypr/utils/contexts";
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
import { parseMarkdownBlocks } from "../utils/markdown-parser";

interface ActiveEntityInfo {
  id: string;
  type: BadgeType;
}

export type BadgeType = "note" | "human" | "organization";

export function ChatView() {
  const navigate = useNavigate();
  const { isExpanded, chatInputRef } = useRightPanel();
  const { userId } = useHypr();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);

  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

  // Add generation tracking state
  const [isGenerating, setIsGenerating] = useState(false);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });

  const sessionId = activeEntity?.type === "note" ? activeEntity.id : null;

  console.log("🔍 DEBUG: sessionId =", sessionId);
  console.log("🔍 DEBUG: userId =", userId);
  console.log("🔍 DEBUG: activeEntity =", activeEntity);

  // Replace the current chatMessagesQuery with this updated version:
  const chatMessagesQuery = useQuery({
    enabled: !!sessionId && !!userId,
    queryKey: ["chat-messages", sessionId],
    queryFn: async () => {
      if (!sessionId || !userId) return [];

      console.log("🔍 DEBUG: Current session ID =", sessionId);

      // Find existing chat groups for this session
      const existingGroups = await dbCommands.listChatGroups(userId);
      const sessionGroups = existingGroups.filter(group => group.session_id === sessionId);
      
      console.log("🔍 DEBUG: Available chat groups for this session =", sessionGroups);
      
      if (sessionGroups.length === 0) {
        // No chat groups exist for this session
        return [];
      }

      // Get the latest chat group (most recent created_at)
      const latestGroup = sessionGroups.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Load messages for the latest chat group
      const dbMessages = await dbCommands.listChatMessages(latestGroup.id);
      return dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === "User",
        timestamp: new Date(msg.created_at),
        parts: msg.role === "Assistant" ? parseMarkdownBlocks(msg.content) : undefined,
      }));
    },
  });

  // Update the useEffect that sets messages:
  useEffect(() => {
    if (chatMessagesQuery.data) {
      setMessages(chatMessagesQuery.data);
      setHasChatStarted(chatMessagesQuery.data.length > 0);
    }
  }, [chatMessagesQuery.data]);

  // Simple helper to get or create chat group
  const getChatGroupId = async (): Promise<string> => {
    if (!sessionId || !userId) throw new Error("No session or user");
    
    const existingGroups = await dbCommands.listChatGroups(userId);
    let chatGroup = existingGroups.find(group => group.session_id === sessionId);
    
    if (!chatGroup) {
      chatGroup = await dbCommands.createChatGroup({
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: userId,
        name: null,
        created_at: new Date().toISOString(),
      });
    }
    
    return chatGroup.id;
  };

  const sessionData = useQuery({
    enabled: !!sessionId,
    queryKey: ["session", "chat-context", sessionId],
    queryFn: async () => {
      if (!sessionId) {
        return null;
      }

      const session = await dbCommands.getSession({ id: sessionId });
      if (!session) {
        return null;
      }

      return {
        title: session.title || "",
        rawContent: session.raw_memo_html || "",
        enhancedContent: session.enhanced_memo_html,
        preMeetingContent: session.pre_meeting_memo_html,
        words: session.words || [],
      };
    },
  });

  useEffect(() => {
    let newEntity = null;
    
    if (noteMatch) {
      const noteId = noteMatch.params.id;
      newEntity = {
        id: noteId,
        type: "note" as const,
      };
    } else if (humanMatch) {
      const humanId = humanMatch.params.id;
      newEntity = {
        id: humanId,
        type: "human" as const,
      };
    } else if (organizationMatch) {
      const orgId = organizationMatch.params.id;
      newEntity = {
        id: orgId,
        type: "organization" as const,
      };
    }
    
    // Check if we're switching to a different session
    const isDifferentSession = !activeEntity || 
      (newEntity && (activeEntity.id !== newEntity.id || activeEntity.type !== newEntity.type));
    
    if (isDifferentSession) {
      setActiveEntity(newEntity);
      // Reset chat state when switching sessions
      setMessages([]);
      setInputValue("");
      setShowHistory(false);
      setHasChatStarted(false);
      setIsGenerating(false);
    }
  }, [noteMatch, humanMatch, organizationMatch, activeEntity]);

  console.log("🔍 DEBUG: Current messages state =", messages);
  console.log("🔍 DEBUG: hasChatStarted =", hasChatStarted);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const sessions = useSessions((state) => state.sessions);
  const queryClient = useQueryClient();

  // Helper function to save a message to the database
  const saveMessageToDb = async (message: Message) => {
    if (!sessionId || !userId) return;
    
    const groupId = await getChatGroupId();
    await dbCommands.upsertChatMessage({
      id: message.id,
      group_id: groupId,
      created_at: message.timestamp.toISOString(),
      role: message.isUser ? "User" : "Assistant",
      content: message.content.trim(),
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
      // Convert markdown to HTML using the same function as the card
      const html = await miscCommands.opinionatedMdToHtml(markdownContent);

      // Update the enhanced note content
      sessionStore.getState().updateEnhancedNote(html);

      console.log("Applied markdown content to enhanced note");
    } catch (error) {
      console.error("Failed to apply markdown content:", error);
    }
  };

  const prepareMessageHistory = async (messages: Message[], currentUserMessage?: string) => {
    const refetchResult = await sessionData.refetch();
    let freshSessionData = refetchResult.data;

    const { type } = await connectorCommands.getLlmConnection();
    
    // Get participants from database like the editor area does (only if sessionId exists)
    const participants = sessionId ? await dbCommands.sessionListParticipants(sessionId) : [];
    
    // Get calendar event information if sessionId exists
    const calendarEvent = sessionId ? await dbCommands.sessionGetEvent(sessionId) : null;
    
    // Get current date and time
    const currentDateTime = new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Format event information if available
    const eventInfo = calendarEvent 
      ? `${calendarEvent.name} (${calendarEvent.start_date} - ${calendarEvent.end_date})${calendarEvent.note ? ` - ${calendarEvent.note}` : ''}`
      : "";

    const systemContent = await templateCommands.render("ai_chat.system", {
      session: freshSessionData,
      words: JSON.stringify(freshSessionData?.words || []),
      title: freshSessionData?.title,
      enhancedContent: freshSessionData?.enhancedContent,
      rawContent: freshSessionData?.rawContent,
      preMeetingContent: freshSessionData?.preMeetingContent,
      type: type,
      date: currentDateTime,
      participants: participants,
      event: eventInfo,
    });

    console.log("systemContent", systemContent);

    const conversationHistory: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system" as const, content: systemContent },
    ];

    messages.forEach(message => {
      conversationHistory.push({
        role: message.isUser ? ("user" as const) : ("assistant" as const),
        content: message.content,
      });
    });

    if (currentUserMessage) {
      conversationHistory.push({
        role: "user" as const,
        content: currentUserMessage,
      });
    }

    return conversationHistory;
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isGenerating) { // Prevent submit if generating
      return;
    }

    await analyticsCommands.event({
      event: "chat_message_sent",
      distinct_id: userId,
    });

    if (!hasChatStarted && activeEntity) {
      setHasChatStarted(true);
    }

    // Set generating to true
    setIsGenerating(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");

    // Save user message to database
    await saveMessageToDb(userMessage);

    try {
      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: "Generating...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      const { textStream } = streamText({
        model,
        messages: await prepareMessageHistory(messages, currentInput),
      });

      let aiResponse = "";

      for await (const chunk of textStream) {
        aiResponse += chunk;

        // Parse the content for markdown blocks
        const parts = parseMarkdownBlocks(aiResponse);

        setMessages((prev) =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? {
                ...msg,
                content: aiResponse,
                parts: parts, // Add parsed parts
              }
              : msg
          )
        );
      }

      // Generation complete - enable submit
      setIsGenerating(false);

      // Save final AI message to database
      const finalAiMessage = {
        id: aiMessageId,
        content: aiResponse.trim(), // Add .trim() here
        isUser: false,
        timestamp: new Date(),
      };
      await saveMessageToDb(finalAiMessage);
    } catch (error) {
      console.error("AI error:", error);

      // Error occurred - enable submit
      setIsGenerating(false);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // Save error message to database
      await saveMessageToDb(aiMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = async (prompt: string) => {
    if (isGenerating) { // Prevent quick action if generating
      return;
    }

    await analyticsCommands.event({
      event: "chat_quickaction_sent",
      distinct_id: userId,
    });

    if (!hasChatStarted && activeEntity) {
      setHasChatStarted(true);
    }

    // Set generating to true
    setIsGenerating(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Save user message to database
    await saveMessageToDb(userMessage);

    try {
      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: "Generating...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      const { textStream } = streamText({
        model,
        messages: await prepareMessageHistory(messages, prompt),
      });

      let aiResponse = "";

      for await (const chunk of textStream) {
        aiResponse += chunk;

        // Parse the content for markdown blocks
        const parts = parseMarkdownBlocks(aiResponse);

        setMessages((prev) =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? {
                ...msg,
                content: aiResponse,
                parts: parts, // Add parsed parts
              }
              : msg
          )
        );
      }

      // Generation complete
      setIsGenerating(false);

      // Save final AI message to database
      const finalAiMessage = {
        id: aiMessageId,
        content: aiResponse.trim(), // Add .trim() here
        isUser: false,
        timestamp: new Date(),
      };
      await saveMessageToDb(finalAiMessage);
    } catch (error) {
      console.error("AI error:", error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      // Error occurred
      setIsGenerating(false);
      
      // Save error message to database
      await saveMessageToDb(aiMessage);
    }

    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleFocusInput = () => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleNewChat = async () => {
    if (!sessionId || !userId) return;

    try {
      // Create a new chat group for this session
      const newChatGroup = await dbCommands.createChatGroup({
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: userId,
        name: null,
        created_at: new Date().toISOString(),
      });

      // Clear messages and reset state
      setMessages([]);
      setHasChatStarted(false);
      
      // Refetch to get the new empty state
      chatMessagesQuery.refetch();
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
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
        onSubmit={handleSubmit}
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
