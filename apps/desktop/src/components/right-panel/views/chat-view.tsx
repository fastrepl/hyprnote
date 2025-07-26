import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

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
  
  // Track current chat group
  const [currentChatGroupId, setCurrentChatGroupId] = useState<string | null>(null);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });

  const sessionId = activeEntity?.type === "note" ? activeEntity.id : null;

  console.log("🔍 DEBUG: sessionId =", sessionId);
  console.log("🔍 DEBUG: userId =", userId);
  console.log("🔍 DEBUG: activeEntity =", activeEntity);

  // Query to get all chat groups for the session with first messages
  const chatGroupsQuery = useQuery({
    enabled: !!sessionId && !!userId,
    queryKey: ["chat-groups", sessionId],
    queryFn: async () => {
      if (!sessionId || !userId) return [];
      const groups = await dbCommands.listChatGroups(sessionId);
      
      // Fetch first message for each group
      const groupsWithFirstMessage = await Promise.all(
        groups.map(async (group) => {
          const messages = await dbCommands.listChatMessages(group.id);
          const firstUserMessage = messages.find(msg => msg.role === "User");
          return {
            ...group,
            firstMessage: firstUserMessage?.content || ""
          };
        })
      );
      
      return groupsWithFirstMessage;
    },
  });

  // Set current chat group to latest when groups load or session changes
  useEffect(() => {
    if (chatGroupsQuery.data && chatGroupsQuery.data.length > 0) {
      const latestGroup = chatGroupsQuery.data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      setCurrentChatGroupId(latestGroup.id);
    } else if (chatGroupsQuery.data && chatGroupsQuery.data.length === 0) {
      // No groups exist for this session
      setCurrentChatGroupId(null);
    }
  }, [chatGroupsQuery.data, sessionId]); // Add sessionId as dependency to trigger when session changes

  // Replace the current chatMessagesQuery with this updated version:
  const chatMessagesQuery = useQuery({
    enabled: !!currentChatGroupId,
    queryKey: ["chat-messages", currentChatGroupId],
    queryFn: async () => {
      if (!currentChatGroupId) return [];

      console.log("🔍 DEBUG: Loading messages for chat group =", currentChatGroupId);

      // Load messages for the current chat group
      const dbMessages = await dbCommands.listChatMessages(currentChatGroupId);
      return dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === "User",
        timestamp: new Date(msg.created_at),
        parts: msg.role === "Assistant" ? parseMarkdownBlocks(msg.content) : undefined,
      }));
    },
  });

  const prevIsGenerating = useRef(isGenerating);
  
  // Update the useEffect that sets messages:
  useEffect(() => {
    // Load messages from database when query data changes
    // But skip if we just finished generating (transition from true to false)
    const justFinishedGenerating = prevIsGenerating.current === true && isGenerating === false;
    prevIsGenerating.current = isGenerating;
    
    if (chatMessagesQuery.data && !isGenerating && !justFinishedGenerating) {
      setMessages(chatMessagesQuery.data);
      setHasChatStarted(chatMessagesQuery.data.length > 0);
    }
  }, [chatMessagesQuery.data, isGenerating]);

  // Simple helper to get or create chat group
  const getChatGroupId = async (): Promise<string> => {
    if (!sessionId || !userId) throw new Error("No session or user");
    
    // If we have a current chat group, use it
    if (currentChatGroupId) {
      return currentChatGroupId;
    }
    
    // Otherwise create a new one (this happens when sending first message in a new chat)
    const chatGroup = await dbCommands.createChatGroup({
      id: crypto.randomUUID(),
      session_id: sessionId,
      user_id: userId,
      name: null,
      created_at: new Date().toISOString(),
    });
    
    setCurrentChatGroupId(chatGroup.id);
    chatGroupsQuery.refetch();
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
      // Don't reset currentChatGroupId - let the useEffect handle it
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

    // Get or create chat group ID once at the beginning
    const groupId = await getChatGroupId();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");

    // Save user message to database with specific group ID
    await dbCommands.upsertChatMessage({
      id: userMessage.id,
      group_id: groupId,
      created_at: userMessage.timestamp.toISOString(),
      role: "User",
      content: userMessage.content.trim(),
    });

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

      // Save final AI message to database with same group ID
      await dbCommands.upsertChatMessage({
        id: aiMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: aiResponse.trim(),
      });
      
      // Generation complete - enable submit
      setIsGenerating(false);
    } catch (error) {
      console.error("AI error:", error);

      // Error occurred - enable submit
      setIsGenerating(false);

      const errorMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: errorMessageId,
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // Save error message to database with same group ID
      await dbCommands.upsertChatMessage({
        id: errorMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: "Sorry, I encountered an error. Please try again.",
      });
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

    // Get or create chat group ID once at the beginning
    const groupId = await getChatGroupId();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Save user message to database with specific group ID
    await dbCommands.upsertChatMessage({
      id: userMessage.id,
      group_id: groupId,
      created_at: userMessage.timestamp.toISOString(),
      role: "User",
      content: userMessage.content.trim(),
    });

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

      // Save final AI message to database with same group ID
      await dbCommands.upsertChatMessage({
        id: aiMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: aiResponse.trim(),
      });
      
      // Generation complete
      setIsGenerating(false);
    } catch (error) {
      console.error("AI error:", error);
      
      // Error occurred
      setIsGenerating(false);
      
      const errorMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: errorMessageId,
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // Save error message to database with same group ID
      await dbCommands.upsertChatMessage({
        id: errorMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: "Sorry, I encountered an error. Please try again.",
      });
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

    // Just clear the current chat without creating a new group
    setCurrentChatGroupId(null);
    setMessages([]);
    setHasChatStarted(false);
    setInputValue("");
  };
  
  const handleSelectChatGroup = async (groupId: string) => {
    setCurrentChatGroupId(groupId);
    // Messages will be refetched automatically due to query dependency
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
