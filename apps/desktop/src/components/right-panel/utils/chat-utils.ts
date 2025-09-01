import type { SelectionData } from "@/contexts/right-panel";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as templateCommands } from "@hypr/plugin-template";
import { Message } from "../components/chat/types";

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

export const prepareMessageHistory = async (
  messages: Message[],
  currentUserMessage?: string,
  mentionedContent?: Array<{ id: string; type: string; label: string }>,
  modelId?: string,
  mcpToolsArray?: Array<{ name: string; description: string; inputSchema: string }>,
  sessionData?: any,
  sessionId?: string | null,
  userId?: string | null,
  apiBase?: string | null,
  selectionData?: SelectionData, // Add selectionData parameter
) => {
  const refetchResult = await sessionData?.refetch();
  let freshSessionData = refetchResult?.data;

  const { type } = await connectorCommands.getLlmConnection();

  const participants = sessionId ? await dbCommands.sessionListParticipants(sessionId) : [];

  const calendarEvent = sessionId ? await dbCommands.sessionGetEvent(sessionId) : null;

  const currentDateTime = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const eventInfo = calendarEvent
    ? `${calendarEvent.name} (${calendarEvent.start_date} - ${calendarEvent.end_date})${
      calendarEvent.note ? ` - ${calendarEvent.note}` : ""
    }`
    : "";

  const toolEnabled = !!(
    modelId === "gpt-4.1"
    || modelId === "openai/gpt-4.1"
    || modelId === "anthropic/claude-sonnet-4"
    || modelId === "openai/gpt-4o"
    || modelId === "gpt-4o"
    || modelId === "openai/gpt-5"
    || (apiBase && apiBase.includes("pro.hyprnote.com"))
  );

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

          let humanContent = "";
          humanContent += "Name: " + humanData?.full_name + "\n";
          humanContent += "Email: " + humanData?.email + "\n";
          humanContent += "Job Title: " + humanData?.job_title + "\n";
          humanContent += "LinkedIn: " + humanData?.linkedin_username + "\n";

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
                      const div = document.createElement("div");
                      div.innerHTML = session.enhanced_memo_html;
                      briefContent = (div.textContent || div.innerText || "").slice(0, 200) + "...";
                    } else if (session.raw_memo_html && session.raw_memo_html.trim() !== "") {
                      const div = document.createElement("div");
                      div.innerHTML = session.raw_memo_html;
                      briefContent = (div.textContent || div.innerText || "").slice(0, 200) + "...";
                    }

                    humanContent += `- "${session.title || "Untitled"}": ${briefContent}\n`;
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching notes for person "${humanData.full_name}":`, error);
            }
          }

          if (humanData) {
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

  // Use the user template to format the user message
  if (currentUserMessage) {
    const userContent = await templateCommands.render("chat.user", {
      message: currentUserMessage,
      mentionedContent: processedMentions,
      selectionData: selectionData
        ? {
          text: selectionData.text,
          startOffset: selectionData.startOffset,
          endOffset: selectionData.endOffset,
          sessionId: selectionData.sessionId,
          timestamp: selectionData.timestamp,
        }
        : undefined, // Convert to plain object for JsonValue compatibility
    });

    conversationHistory.push({
      role: "user" as const,
      content: userContent,
    });
  }

  return conversationHistory;
};
