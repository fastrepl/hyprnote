import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import type { Message } from "../types/chat-types";
import { parseMarkdownBlocks } from "../utils/markdown-parser";

interface UseChatQueriesProps {
  sessionId: string | null;
  userId: string | null;
  currentChatGroupId: string | null;
  setCurrentChatGroupId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  setHasChatStarted: (started: boolean) => void;
  isGenerating?: boolean;
  prevIsGenerating?: React.MutableRefObject<boolean>;
}

export function useChatQueries({
  sessionId,
  userId,
  currentChatGroupId,
  setCurrentChatGroupId,
  setMessages,
  setHasChatStarted,
  isGenerating,
  prevIsGenerating,
}: UseChatQueriesProps) {
  const chatGroupsQuery = useQuery({
    enabled: !!sessionId && !!userId,
    queryKey: ["chat-groups", sessionId],
    queryFn: async () => {
      if (!sessionId || !userId) {
        return [];
      }
      const groups = await dbCommands.listChatGroups(sessionId);

      const groupsWithFirstMessage = await Promise.all(
        groups.map(async (group) => {
          const messages = await dbCommands.listChatMessages(group.id);
          const firstUserMessage = messages.find(msg => msg.role === "User");

          // Find the most recent message timestamp in this group
          const mostRecentMessageTimestamp = messages.length > 0
            ? Math.max(...messages.map(msg => new Date(msg.created_at).getTime()))
            : new Date(group.created_at).getTime(); // Fallback to group creation time if no messages

          return {
            ...group,
            firstMessage: firstUserMessage?.content || "",
            mostRecentMessageTimestamp,
          };
        }),
      );

      return groupsWithFirstMessage;
    },
  });

  useEffect(() => {
    if (chatGroupsQuery.data && chatGroupsQuery.data.length > 0) {
      // Sort by most recent message timestamp instead of group creation time
      const latestGroup = chatGroupsQuery.data.sort((a, b) =>
        b.mostRecentMessageTimestamp - a.mostRecentMessageTimestamp
      )[0];
      setCurrentChatGroupId(latestGroup.id);
    } else if (chatGroupsQuery.data && chatGroupsQuery.data.length === 0) {
      // No groups exist for this session
      setCurrentChatGroupId(null);
    }
  }, [chatGroupsQuery.data, sessionId, setCurrentChatGroupId]);

  const chatMessagesQuery = useQuery({
    enabled: !!currentChatGroupId,
    queryKey: ["chat-messages", currentChatGroupId],
    queryFn: async () => {
      if (!currentChatGroupId) {
        return [];
      }

      const dbMessages = await dbCommands.listChatMessages(currentChatGroupId);
      return dbMessages.map(msg => {
        // Parse tool_details for all messages
        let parsedToolDetails: any = undefined;
        if (msg.tool_details) {
          try {
            parsedToolDetails = JSON.parse(msg.tool_details);
          } catch (error) {
            console.error("Failed to parse tool_details:", msg.id, error);
          }
        }

        return {
          id: msg.id,
          content: msg.content,
          isUser: msg.role === "User",
          timestamp: new Date(msg.created_at),
          type: msg.type || "text-delta",
          parts: msg.role === "Assistant" ? parseMarkdownBlocks(msg.content) : undefined,
          toolDetails: parsedToolDetails,
        };
      });
    },
  });

  useEffect(() => {
    const justFinishedGenerating = prevIsGenerating && prevIsGenerating.current === true && isGenerating === false;
    if (prevIsGenerating) {
      prevIsGenerating.current = isGenerating || false;
    }

    if (chatMessagesQuery.data) {
      if (!isGenerating && !justFinishedGenerating) {
        // Safe to sync from database
        setMessages(chatMessagesQuery.data);
        setHasChatStarted(chatMessagesQuery.data.length > 0);
      } else {
        // Currently generating - DON'T override local state
        console.log("Skipping DB sync - currently generating");
      }
    }
  }, [chatMessagesQuery.data, isGenerating, setMessages, setHasChatStarted, prevIsGenerating]);

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

  const getChatGroupId = async (): Promise<string> => {
    if (!sessionId || !userId) {
      throw new Error("No session or user");
    }

    if (currentChatGroupId) {
      return currentChatGroupId;
    }

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

  return {
    chatGroupsQuery,
    chatMessagesQuery,
    sessionData,
    getChatGroupId,
  };
}
