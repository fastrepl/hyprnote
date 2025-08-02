import { message } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import { useLicense } from "@/hooks/use-license";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import { modelProvider, streamText, tool } from "@hypr/utils/ai";
import { useSessions } from "@hypr/utils/contexts";
import { z } from "zod";

import type { ActiveEntityInfo, Message } from "../types/chat-types";
import { parseMarkdownBlocks } from "../utils/markdown-parser";

interface UseChatLogicProps {
  sessionId: string | null;
  userId: string | null;
  activeEntity: ActiveEntityInfo | null;
  messages: Message[];
  inputValue: string;
  hasChatStarted: boolean;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setInputValue: (value: string) => void;
  setHasChatStarted: (started: boolean) => void;
  getChatGroupId: () => Promise<string>;
  sessionData: any;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  llmConnectionQuery: any;
}

export function useChatLogic({
  sessionId,
  userId,
  activeEntity,
  messages,
  inputValue,
  hasChatStarted,
  setMessages,
  setInputValue,
  setHasChatStarted,
  getChatGroupId,
  sessionData,
  chatInputRef,
  llmConnectionQuery,
}: UseChatLogicProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const sessions = useSessions((state) => state.sessions);
  const { getLicense } = useLicense();

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

      sessionStore.getState().updateEnhancedNote(html);

      console.log("Applied markdown content to enhanced note");
    } catch (error) {
      console.error("Failed to apply markdown content:", error);
    }
  };

  const prepareMessageHistory = async (
    messages: Message[],
    currentUserMessage?: string,
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
  ) => {
    const refetchResult = await sessionData.refetch();
    let freshSessionData = refetchResult.data;

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

    if (mentionedContent && mentionedContent.length > 0) {
      currentUserMessage +=
        "[[From here is an automatically appended content from the mentioned notes & people, not what the user wrote. Use this only as a reference for more context. Your focus should always be the current meeting user is viewing]]"
        + "\n\n";
    }

    if (mentionedContent && mentionedContent.length > 0) {
      const noteContents: string[] = [];

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

              noteContents.push(`\n\n--- Content from the note"${mention.label}" ---\n${noteContent}`);
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
                    const isParticipant = participants.some(p =>
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
              noteContents.push(`\n\n--- Content about the person "${mention.label}" ---\n${humanContent}`);
            }
          }
        } catch (error) {
          console.error(`Error fetching content for "${mention.label}":`, error);
        }
      }

      if (noteContents.length > 0) {
        currentUserMessage = currentUserMessage + noteContents.join("");
      }
    }

    if (currentUserMessage) {
      conversationHistory.push({
        role: "user" as const,
        content: currentUserMessage,
      });
    }

    return conversationHistory;
  };

  const processUserMessage = async (
    content: string,
    analyticsEvent: string,
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
  ) => {
    if (!content.trim() || isGenerating) {
      return;
    }

    if (messages.length >= 14 && !getLicense.data?.valid) {
      if (userId) {
        await analyticsCommands.event({
          event: "pro_license_required_chat",
          distinct_id: userId,
        });
      }
      await message("7 messages are allowed per conversation for free users.", {
        title: "Pro License Required",
        kind: "info",
      });
      return;
    }

    if (userId) {
      await analyticsCommands.event({
        event: analyticsEvent,
        distinct_id: userId,
      });
    }

    if (!hasChatStarted && activeEntity) {
      setHasChatStarted(true);
    }

    setIsGenerating(true);

    const groupId = await getChatGroupId();

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    await dbCommands.upsertChatMessage({
      id: userMessage.id,
      group_id: groupId,
      created_at: userMessage.timestamp.toISOString(),
      role: "User",
      content: userMessage.content.trim(),
    });

    // Declare aiMessageId outside try block so it's accessible in catch
    const aiMessageId = (Date.now() + 1).toString();

    try {
      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      const aiMessage: Message = {
        id: aiMessageId,
        content: "Generating...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      const { textStream } = streamText({
        model,
        messages: await prepareMessageHistory(messages, content, mentionedContent),
        // Add tools conditionally for local LLM (same as enhance)
        ...(llmConnectionQuery.data?.type === "HyprLocal" && {
          tools: {
            update_progress: tool({ inputSchema: z.any() }),
          },
        }),
        onError: (error) => {
          console.error("On Error Catch:", error);
          setIsGenerating(false);
          throw error;
        },
      });

      let aiResponse = "";

      for await (const chunk of textStream) {
        aiResponse += chunk;

        const parts = parseMarkdownBlocks(aiResponse);

        setMessages((prev) =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? {
                ...msg,
                content: aiResponse,
                parts: parts,
              }
              : msg
          )
        );
      }

      await dbCommands.upsertChatMessage({
        id: aiMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: aiResponse.trim(),
      });

      setIsGenerating(false);
    } catch (error) {
      console.error("AI error:", error);

      const errorMessage = (error as any)?.error || "Unknown error";

      let finalErrorMesage = "";

      if (String(errorMessage).includes("too large")) {
        finalErrorMesage =
          "Sorry, I encountered an error. Please try again. Your transcript or meeting notes might be too large. Please try again with a smaller transcript or meeting notes."
          + "\n\n" + errorMessage;
      } else {
        finalErrorMesage = "Sorry, I encountered an error. Please try again. " + "\n\n" + errorMessage;
      }

      setIsGenerating(false);

      setMessages((prev) =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
              ...msg,
              content: finalErrorMesage,
            }
            : msg
        )
      );

      await dbCommands.upsertChatMessage({
        id: aiMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: finalErrorMesage,
      });
    }
  };

  const handleSubmit = async (mentionedContent?: Array<{ id: string; type: string; label: string }>) => {
    await processUserMessage(inputValue, "chat_message_sent", mentionedContent);
  };

  const handleQuickAction = async (prompt: string) => {
    await processUserMessage(prompt, "chat_quickaction_sent");

    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return {
    isGenerating,
    handleSubmit,
    handleQuickAction,
    handleApplyMarkdown,
    handleKeyDown,
  };
}
