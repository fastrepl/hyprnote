import type { SelectionData } from "@/contexts/right-panel";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as templateCommands } from "@hypr/plugin-template";
import type { UIMessage } from "@hypr/utils/ai";
import { convertToModelMessages } from "@hypr/utils/ai";

export const formatDate = (date: Date) => {
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

export const focusInput = (chatInputRef: React.RefObject<HTMLTextAreaElement>) => {
  if (chatInputRef.current) {
    chatInputRef.current.focus();
  }
};

/**
 * Cleans UIMessages to remove tool parts with problematic states
 * that are not compatible with model messages.
 * This is a workaround for the Vercel AI SDK v5 limitation.
 */
export const cleanUIMessages = (messages: UIMessage[]): UIMessage[] => {
  return messages.map(message => {
    // Only process messages that have parts
    if (!message.parts || !Array.isArray(message.parts)) {
      return message;
    }

    // Filter out tool parts with problematic states
    const cleanedParts = message.parts.filter(part => {
      // Check if this is a tool part (dynamic-tool or tool-*)
      if (part.type === "dynamic-tool" || part.type?.startsWith("tool-")) {
        const toolPart = part as any;

        // Filter out UI-specific states that cause conversion errors
        // Keep only text parts and tool parts without problematic states
        if (
          toolPart.state === "input-available"
          || toolPart.state === "output-available"
          || toolPart.state === "input-streaming"
          || toolPart.state === "output-error"
        ) {
          return false; // Remove these tool parts
        }
      }

      // Keep all other parts (text, etc.)
      return true;
    });

    return {
      ...message,
      parts: cleanedParts,
    };
  });
};

/**
 * Prepares messages for AI model with system prompt and context.
 * Works with UIMessage types from Vercel AI SDK v5.
 */
export const prepareMessagesForAI = async (
  messages: UIMessage[],
  options: {
    sessionId: string | null;
    userId: string | null;
    sessionData?: any;
    selectionData?: SelectionData;
    mentionedContent?: Array<{ id: string; type: string; label: string }>;
  },
) => {
  const { sessionId, userId, sessionData, selectionData, mentionedContent } = options;

  // sessionData is already the data object from the query, not the query itself
  // It doesn't have a refetch method - it's just the plain data
  let freshSessionData = sessionData;

  // If no session data and we have sessionId, fetch it directly
  if (!freshSessionData && sessionId) {
    try {
      const session = await dbCommands.getSession({ id: sessionId });
      if (session) {
        freshSessionData = {
          title: session.title || "",
          rawContent: session.raw_memo_html || "",
          enhancedContent: session.enhanced_memo_html,
          preMeetingContent: session.pre_meeting_memo_html,
          words: session.words || [],
        };
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
    }
  }

  // Get connection info
  const llmConnection = await connectorCommands.getLlmConnection();
  const { type } = llmConnection;
  const apiBase = llmConnection.connection?.api_base;
  const customModel = await connectorCommands.getCustomLlmModel();
  const modelId = type === "Custom" && customModel ? customModel : "gpt-4";

  // Get participants and calendar event
  const participants = sessionId
    ? await dbCommands.sessionListParticipants(sessionId)
    : [];
  const calendarEvent = sessionId
    ? await dbCommands.sessionGetEvent(sessionId)
    : null;

  // Format current date/time
  const currentDateTime = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Format event info
  const eventInfo = calendarEvent
    ? `${calendarEvent.name} (${calendarEvent.start_date} - ${calendarEvent.end_date}${
      calendarEvent.note ? ` - ${calendarEvent.note}` : ""
    })`
    : "";

  // Determine if tools are enabled
  const toolEnabled = !!(
    modelId === "gpt-4.1"
    || modelId === "openai/gpt-4.1"
    || modelId === "anthropic/claude-sonnet-4"
    || modelId === "openai/gpt-4o"
    || modelId === "gpt-4o"
    || modelId === "openai/gpt-5"
    || (apiBase && apiBase.includes("pro.hyprnote.com"))
  );

  // Get MCP tools list for system prompt
  const mcpCommands = await import("@hypr/plugin-mcp").then(m => m.commands);
  const mcpServers = await mcpCommands.getServers();
  const enabledServers = mcpServers.filter((server) => server.enabled);
  const mcpToolsArray = enabledServers.map((server) => ({
    name: server.type, // Using type as name since that's what's available
    description: "",
    inputSchema: "{}",
  }));

  // Generate system message using template
  const systemContent = await templateCommands.render("chat.system", {
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
    toolEnabled: toolEnabled,
    mcpTools: mcpToolsArray,
  });

  // Clean UIMessages to remove problematic tool states before conversion
  const cleanedMessages = cleanUIMessages(messages);

  // Convert cleaned UIMessages to model messages
  const modelMessages = convertToModelMessages(cleanedMessages);
  const preparedMessages: any[] = [];

  // Always add system message first
  preparedMessages.push({
    role: "system",
    content: systemContent,
  });

  // Process all messages, enhancing the last user message if needed
  for (let i = 0; i < modelMessages.length; i++) {
    const msg = modelMessages[i];

    // Check if this is the last user message and we have context to add
    const isLastUserMessage = i === modelMessages.length - 1 && msg.role === "user";

    if (isLastUserMessage && (mentionedContent || selectionData)) {
      // Process mentions
      const processedMentions: Array<{ type: string; label: string; content: string }> = [];

      if (mentionedContent && mentionedContent.length > 0) {
        for (const mention of mentionedContent) {
          try {
            if (mention.type === "note") {
              const sessionData = await dbCommands.getSession({ id: mention.id });
              if (sessionData) {
                let noteContent = "";
                if (sessionData.enhanced_memo_html && sessionData.enhanced_memo_html.trim() !== "") {
                  noteContent = sessionData.enhanced_memo_html;
                } else if (sessionData.raw_memo_html && sessionData.raw_memo_html.trim() !== "") {
                  noteContent = sessionData.raw_memo_html;
                } else {
                  continue;
                }
                processedMentions.push({
                  type: "note",
                  label: mention.label,
                  content: noteContent,
                });
              }
            }

            if (mention.type === "human") {
              const humanData = await dbCommands.getHuman(mention.id);
              if (humanData) {
                let humanContent = "";
                humanContent += "Name: " + humanData?.full_name + "\n";
                humanContent += "Email: " + humanData?.email + "\n";
                humanContent += "Job Title: " + humanData?.job_title + "\n";
                humanContent += "LinkedIn: " + humanData?.linkedin_username + "\n";

                // Add recent sessions for this person
                if (humanData?.full_name) {
                  try {
                    const participantSessions = await dbCommands.listSessions({
                      type: "search",
                      query: humanData.full_name,
                      user_id: userId || "",
                      limit: 5,
                    });

                    if (participantSessions.length > 0) {
                      humanContent += "\nNotes this person participated in:\n";
                      for (const session of participantSessions.slice(0, 2)) {
                        const participants = await dbCommands.sessionListParticipants(session.id);
                        const isParticipant = participants.some((p: any) =>
                          p.full_name === humanData.full_name || p.email === humanData.email
                        );

                        if (isParticipant) {
                          let briefContent = "";
                          if (session.enhanced_memo_html && session.enhanced_memo_html.trim() !== "") {
                            // Strip HTML tags for brief content
                            briefContent = session.enhanced_memo_html.replace(/<[^>]*>/g, "").slice(0, 200) + "...";
                          } else if (session.raw_memo_html && session.raw_memo_html.trim() !== "") {
                            briefContent = session.raw_memo_html.replace(/<[^>]*>/g, "").slice(0, 200) + "...";
                          }
                          humanContent += `- "${session.title || "Untitled"}": ${briefContent}\n`;
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`Error fetching notes for person "${humanData.full_name}":`, error);
                  }
                }

                processedMentions.push({
                  type: "human",
                  label: mention.label,
                  content: humanContent,
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching content for "${mention.label}":`, error);
          }
        }
      }

      // Get the original user message content
      const originalContent = typeof msg.content === "string"
        ? msg.content
        : msg.content.map((part: any) => part.type === "text" ? part.text : "").join("");

      // Use the user template to format the enhanced message
      const enhancedContent = await templateCommands.render("chat.user", {
        message: originalContent,
        mentionedContent: processedMentions,
        selectionData: selectionData
          ? {
            text: selectionData.text,
            startOffset: selectionData.startOffset,
            endOffset: selectionData.endOffset,
            sessionId: selectionData.sessionId,
            timestamp: selectionData.timestamp,
          }
          : undefined,
      });

      preparedMessages.push({
        role: "user",
        content: enhancedContent,
      });
    } else {
      // For all other messages, just add them as-is
      preparedMessages.push(msg);
    }
  }

  return preparedMessages;
};
