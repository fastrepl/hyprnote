import { useChat } from "@hypr/utils/ai";
import { commands as dbCommands } from "@hypr/plugin-db";
import { useCallback, useRef, useEffect } from "react";
import { CustomChatTransport } from "../utils/chat-transport";
import { useLicense } from "@/hooks/use-license";

interface UseChat2Props {
  sessionId: string | null;
  userId: string | null;
  conversationId: string | null;
  sessionData?: any;
  selectionData?: any;
  sessions?: any;
  onError?: (error: Error) => void;
}

// This hook wraps useChat with custom transport and handles conversation persistence
// Conversation switching is handled via setMessages in the parent component
export function useChat2({
  sessionId,
  userId,
  conversationId,
  sessionData,
  selectionData,
  sessions,
  onError,
}: UseChat2Props) {
  const { getLicense } = useLicense();
  const transportRef = useRef<CustomChatTransport | null>(null);
  const conversationIdRef = useRef(conversationId);
  
  // Keep ref updated with latest conversation ID
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Create transport instance
  if (!transportRef.current) {
    transportRef.current = new CustomChatTransport({
      sessionId,
      userId,
      sessionData,
      selectionData,
      sessions,
      getLicense: getLicense as any, // Type assertion for getLicense
    });
  }

  // Update transport options when they change
  useEffect(() => {
    if (transportRef.current) {
      transportRef.current.updateOptions({
        sessionId,
        userId,
        sessionData,
        selectionData,
        sessions,
        getLicense: getLicense as any, // Type assertion for getLicense
      });
    }
  }, [sessionId, userId, sessionData, selectionData, sessions, getLicense]);

  // Clean up transport on unmount
  useEffect(() => {
    return () => {
      if (transportRef.current) {
        transportRef.current.cleanup();
      }
    };
  }, []);

  // useChat with proper configuration
  const {
    messages,
    sendMessage: sendAIMessage,
    stop,
    status,
    error,
    addToolResult,
    setMessages,
  } = useChat({
    transport: transportRef.current,
    // Don't pass initial messages here - we'll load them via setMessages in chat-view
    messages: [],
    // Use stable ID - conversation switching handled via setMessages
    id: sessionId || "default",
    onError: (err) => {
      console.error("Chat error:", err);
      onError?.(err);
    },
    onFinish: async ({ message }) => {
      // Use ref to get current conversation ID (avoid stale closure)
      const currentConvId = conversationIdRef.current;
      if (currentConvId && message && message.role === "assistant") {
        try {
          await dbCommands.createMessageV2({
            id: message.id,
            conversation_id: currentConvId,
            role: "assistant" as any,
            parts: JSON.stringify(message.parts || []),
            metadata: JSON.stringify(message.metadata || {}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
      } else {
        console.warn("Skipping save - missing data:", { conversationId: currentConvId, messageRole: message?.role });
      }
    },
  });

  // Helper to send a message with metadata
  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        mentionedContent?: Array<{ id: string; type: string; label: string }>;
        selectionData?: any;
        htmlContent?: string;
        conversationId?: string; // Allow passing conversation ID directly
      }
    ) => {
      // Create metadata for the message
      const metadata = {
        mentions: options?.mentionedContent,
        selectionData: options?.selectionData,
        htmlContent: options?.htmlContent,
      };

      // Use passed conversation ID or the one from props
      const convId = options?.conversationId || conversationId;
      
      if (!convId || !content.trim()) {
        return;
      }
      
      // Update transport with mentions and selection data for context enhancement
      // MUST happen BEFORE sending message so tools are loaded correctly
      if (transportRef.current) {
        transportRef.current.updateOptions({
          mentionedContent: options?.mentionedContent,
          selectionData: options?.selectionData,
          sessions: sessions || {}, // Keep sessions even if empty
        });
      }
      
      // Small delay to ensure options are updated before tools are loaded
      await new Promise(resolve => setTimeout(resolve, 10));
      
      try {
        // Save user message to database
        const userMessageId = crypto.randomUUID();
        
        
        
       
        
        await dbCommands.createMessageV2({
          id: userMessageId,
          conversation_id: convId,
          role: "user" as any,
          parts: JSON.stringify([{ type: "text", text: content }]),
          metadata: JSON.stringify(metadata),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        

        // Send to AI using the correct method
        sendAIMessage({
          id: userMessageId,
          role: "user",
          parts: [{ type: "text", text: content }],
          metadata,
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        onError?.(error as Error);
      }
    },
    [sendAIMessage, conversationId]
  );

  // Helper to update message parts during streaming
  const updateMessageParts = useCallback(
    async (messageId: string, parts: any[]) => {
      if (conversationId) {
        try {
          await dbCommands.updateMessageV2Parts(
            messageId,
            JSON.stringify(parts),
          );
        } catch (error) {
          console.error("Failed to update message parts:", error);
        }
      }
    },
    [conversationId]
  );


  return {
    messages,
    stop,
    setMessages,
    isGenerating: status === "streaming" || status === "submitted",
    error,
    addToolResult,
    sendMessage,
    updateMessageParts,
    status,
  };
}