import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { commands as dbCommands } from "@hypr/plugin-db";
import type { UIMessage } from "@hypr/utils/ai";

interface UseChatQueries2Props {
  sessionId: string | null;
  userId: string | null;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  setMessages: (messages: UIMessage[]) => void;
  isGenerating?: boolean;
}

export function useChatQueries2({
  sessionId,
  userId,
  currentConversationId,
  setCurrentConversationId,
  setMessages,
  isGenerating,
}: UseChatQueries2Props) {
  // Load conversations for the session
  const conversationsQuery = useQuery({
    enabled: !!sessionId && !!userId,
    queryKey: ["conversations", sessionId],
    queryFn: async () => {
      if (!sessionId || !userId) {
        return [];
      }
      const conversations = await dbCommands.listConversations(sessionId);
      
      // Get first message preview for each conversation
      const conversationsWithPreview = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await dbCommands.listMessagesV2(conv.id);
          const firstUserMessage = messages.find(msg => msg.role === "user");
          
          // Find most recent message timestamp
          const mostRecentTimestamp = messages.length > 0
            ? Math.max(...messages.map(msg => new Date(msg.created_at).getTime()))
            : new Date(conv.created_at).getTime();
          
          return {
            ...conv,
            firstMessage: firstUserMessage ? (JSON.parse(firstUserMessage.parts)[0]?.text || "") : "",
            mostRecentTimestamp,
          };
        })
      );
      
      return conversationsWithPreview;
    },
  });

  // Auto-select the most recent conversation
  useEffect(() => {
    if (conversationsQuery.data && conversationsQuery.data.length > 0) {
      // Sort by most recent message timestamp
      const latestConversation = conversationsQuery.data.sort((a, b) =>
        b.mostRecentTimestamp - a.mostRecentTimestamp
      )[0];
      setCurrentConversationId(latestConversation.id);
    } else if (conversationsQuery.data && conversationsQuery.data.length === 0) {
      // No conversations exist for this session
      setCurrentConversationId(null);
    }
  }, [conversationsQuery.data, sessionId, setCurrentConversationId]);

  // Load messages for current conversation
  const messagesQuery = useQuery({
    enabled: !!currentConversationId,
    queryKey: ["messages", currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) {
        return [];
      }

      const dbMessages = await dbCommands.listMessagesV2(currentConversationId);
      
      // Convert database messages to UIMessage format
      const uiMessages: UIMessage[] = dbMessages.map(msg => {
        // Parse parts and metadata
        let parts = [];
        let metadata = {};
        
        try {
          parts = JSON.parse(msg.parts);
        } catch (error) {
          console.error("Failed to parse message parts:", msg.id, error);
          // Fallback to text content
          // parts is already a string, no need to parse again
          parts = [{ type: "text", text: "" }];
        }
        
        if (msg.metadata) {
          try {
            metadata = JSON.parse(msg.metadata);
          } catch (error) {
            console.error("Failed to parse message metadata:", msg.id, error);
          }
        }
        
        return {
          id: msg.id,
          role: msg.role as "user" | "assistant" | "system",
          content: parts,
          parts: parts,
          createdAt: new Date(msg.created_at),
          metadata,
        };
      });
      
      return uiMessages;
    },
  });

  // Update messages when loaded (but not during generation)
  useEffect(() => {
    if (messagesQuery.data && !isGenerating) {
      setMessages(messagesQuery.data);
    }
  }, [messagesQuery.data, isGenerating, setMessages]);

  // Load session data for context
  const sessionDataQuery = useQuery({
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

  // Helper to create a new conversation
  const createConversation = async (): Promise<string> => {
    if (!sessionId || !userId) {
      throw new Error("No session or user");
    }

    const conversation = await dbCommands.createConversation({
      id: crypto.randomUUID(),
      session_id: sessionId,
      user_id: userId,
      name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setCurrentConversationId(conversation.id);
    conversationsQuery.refetch();
    return conversation.id;
  };

  // Helper to get or create conversation
  const getOrCreateConversationId = async (): Promise<string> => {
    if (currentConversationId) {
      return currentConversationId;
    }
    return createConversation();
  };

  return {
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    messages: messagesQuery.data || [],
    messagesLoading: messagesQuery.isLoading,
    sessionData: sessionDataQuery.data,
    sessionDataLoading: sessionDataQuery.isLoading,
    createConversation,
    getOrCreateConversationId,
    refetchConversations: conversationsQuery.refetch,
    refetchMessages: messagesQuery.refetch,
  };
}