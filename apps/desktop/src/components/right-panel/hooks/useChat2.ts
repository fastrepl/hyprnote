import { useLicense } from "@/hooks/use-license";
import { commands as dbCommands } from "@hypr/plugin-db";
import { useChat } from "@hypr/utils/ai";
import { useCallback, useEffect, useRef } from "react";
import { CustomChatTransport } from "../utils/chat-transport";

interface UseChat2Props {
  sessionId: string | null;
  userId: string | null;
  conversationId: string | null;
  sessionData?: any;
  selectionData?: any;
  sessions?: any;
  onError?: (error: Error) => void;
}

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

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  if (!transportRef.current) {
    transportRef.current = new CustomChatTransport({
      sessionId,
      userId,
      sessionData,
      selectionData,
      sessions,
      getLicense: getLicense as any,
    });
  }

  useEffect(() => {
    if (transportRef.current) {
      transportRef.current.updateOptions({
        sessionId,
        userId,
        sessionData,
        selectionData,
        sessions,
        getLicense: getLicense as any,
      });
    }
  }, [sessionId, userId, sessionData, selectionData, sessions, getLicense]);

  useEffect(() => {
    return () => {
      if (transportRef.current) {
        transportRef.current.cleanup();
      }
    };
  }, []);

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
    messages: [],
    id: sessionId || "default",
    onError: async (err: any) => {
      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        parts: [{
          type: "text" as const,
          text: `An error occurred: ${err.message}`,
        }] as any,
        metadata: {
          isError: true,
          errorDetails: err,
        },
      } as const;
      setMessages((prev: any) => [...prev, errorMessage]);
      stop();
      onError?.(err);
    },
    onFinish: async ({ message }: { message: any }) => {
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

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        mentionedContent?: Array<{ id: string; type: string; label: string }>;
        selectionData?: any;
        htmlContent?: string;
        conversationId?: string;
      },
    ) => {
      const metadata = {
        mentions: options?.mentionedContent,
        selectionData: options?.selectionData,
        htmlContent: options?.htmlContent,
      };

      const convId = options?.conversationId || conversationId;

      if (!convId || !content.trim()) {
        return;
      }

      if (transportRef.current) {
        transportRef.current.updateOptions({
          mentionedContent: options?.mentionedContent,
          selectionData: options?.selectionData,
          sessions: sessions || {},
        });
      }

      // Small delay to ensure options are updated before tools are loaded
      await new Promise(resolve => setTimeout(resolve, 10));

      try {
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
    [sendAIMessage, conversationId],
  );

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
    [conversationId],
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
