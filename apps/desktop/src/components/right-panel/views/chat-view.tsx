import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { modelProvider, streamText } from "@hypr/utils/ai";
import { commands as dbCommands } from "@hypr/plugin-db";
import { MessagePart } from "../components/chat/types";
import { parseMarkdownBlocks } from "../utils/markdown-parser";

interface ActiveEntityInfo {
  id: string;
  type: BadgeType;
}

export type BadgeType = "note" | "human" | "organization";

export function ChatView() {
  const navigate = useNavigate();
  const { isExpanded, chatInputRef } = useRightPanel();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [hasChatStarted, setHasChatStarted] = useState(false);

  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });

  const sessionId = activeEntity?.type === "note" ? activeEntity.id : null;

  const sessionData = useQuery({
    enabled: !!sessionId,
    queryKey: ["session", "chat-context", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const session = await dbCommands.getSession({ id: sessionId });
      if (!session) return null;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const formatTranscript = (words: Array<{
    text: string;
    speaker?: { type: string; value: { index?: number; id?: string; label?: string } } | null;
    start_ms?: number | null;
    end_ms?: number | null;
    confidence?: number | null;
  }>) => {
    if (!words.length) return null;

    const speakers = new Map<string, string[]>();
    let currentSpeaker = "Unknown";
    let currentChunk: string[] = [];
    
    words.forEach((word, index) => {
      let speakerLabel = "Unknown";
      if (word.speaker?.type === "assigned" && word.speaker.value.label) {
        speakerLabel = word.speaker.value.label;
      } else if (word.speaker?.type === "unassigned" && word.speaker.value.index !== undefined) {
        speakerLabel = `Speaker ${word.speaker.value.index + 1}`;
      }

      if (speakerLabel !== currentSpeaker) {
        if (currentChunk.length > 0) {
          const existing = speakers.get(currentSpeaker) || [];
          speakers.set(currentSpeaker, [...existing, currentChunk.join(' ')]);
          currentChunk = [];
        }
        currentSpeaker = speakerLabel;
      }

      currentChunk.push(word.text);

      if (index === words.length - 1 && currentChunk.length > 0) {
        const existing = speakers.get(currentSpeaker) || [];
        speakers.set(currentSpeaker, [...existing, currentChunk.join(' ')]);
      }
    });

    const transcriptLines: string[] = [];
    speakers.forEach((chunks, speaker) => {
      chunks.forEach(chunk => {
        transcriptLines.push(`${speaker}: ${chunk}`);
      });
    });

    return transcriptLines.join('\n');
  };

  const prepareNoteContext = async () => {
    // Refetch session data to get latest content
    if (sessionId) {
      await sessionData.refetch(); // Option 1: Use refetch method
      
      // Alternative Option 2: Invalidate and refetch
      // await queryClient.invalidateQueries({ 
      //   queryKey: ["session", "chat-context", sessionId] 
      // });
    }

    if (!activeEntity || activeEntity.type !== "note" || !sessionData.data) {
      return null;
    }

    const stripHtml = (html: string) => {
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    };

    const parts: string[] = [];
    
    if (sessionData.data.title) {
      parts.push(`Title: ${sessionData.data.title}`);
    }

    const noteContent = sessionData.data.enhancedContent || sessionData.data.rawContent;
    if (noteContent) {
      const cleanContent = stripHtml(noteContent);
      if (cleanContent) {
        parts.push(`Enhanced Meeting Summary:\n${cleanContent}`);
      }
    }

    /*
    if (sessionData.data.preMeetingContent) {
      const cleanPreMeeting = stripHtml(sessionData.data.preMeetingContent);
      if (cleanPreMeeting) {
        parts.push(`Pre-meeting Notes:\n${cleanPreMeeting}`);
      }
    }
    */

    if (sessionData.data.words && sessionData.data.words.length > 0) {
      const transcript = formatTranscript(sessionData.data.words);
      if (transcript) {
        parts.push(`Full Meeting Transcript:\n${transcript}`);
      }
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  };

  const prepareMessageHistory = async (messages: Message[], currentUserMessage?: string) => {
    const noteContext = await prepareNoteContext();
    console.log("this is the note context", noteContext);
    
    let systemContent = `
    You are a helpful AI meeting assistant in Hyprnote, an intelligent meeting platform that transcribes 
    and analyzes meetings. Your purpose is to help users understand their meeting content better.

    You have access to the meeting transcript and an AI-generated summary of the meeting.

    Always keep your responses concise, professional, and directly relevant to the user's questions.

    YOUR PRIMARY SOURCE OF TRUTH IS THE MEETING TRANSCRIPT. Try to generate responses primarily from the transcript, and then the summary or other information (unless the user asks for something specific).

    ## Response Format Guidelines 
    Your response would be highily likely to be paragraphs with combined information about your thought and whatever note (in markdown format) you generated. 

    For example, 

    'Sure, here is the meeting note that I regenerated with the focus on clariaty and preserving the casual tone.

    \`\`\`
    # Meeting Note
    - This is the meeting note that I regenerated with the focus on clariaty and preserving the casual tone.

    ## Key Takeaways
    - This is the key takeaways that I generated from the meeting transcript.

    ## Action Items
    - This is the action items that I generated from the meeting transcript.

    \`\`\`

    "
    
    IT IS PARAMOUNT THAT WHEN YOU GENERATE RESPONSES LIKE THIS, YOU KEEP THE NOTE INSIDE THE \`\`\`...\`\`\` BLOCKS.
    
    `;
    
    if (noteContext) {
      systemContent += `\n\nContext: You are helping the user with their meeting notes. Here is the current context:\n\n${noteContext}`;
    }

    const conversationHistory: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system" as const, content: systemContent }
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

    console.log("this is the conversation history", conversationHistory);
    return conversationHistory;
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      return;
    }

    if (!hasChatStarted && activeEntity) {
      setHasChatStarted(true);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");

    try {
      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      console.log("this is the model", model);
      console.log("this is the provider", provider);
      console.log("this is the messages so far:", messages);

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: "",
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
                  parts: parts // Add parsed parts
                }
              : msg
          )
        );
      }

    } catch (error) {
      console.error("AI error:", error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = async (prompt: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    try {
      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      console.log("this is the model", model);
      console.log("this is the provider", provider);

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        content: "",
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
                  parts: parts // Add parsed parts
                }
              : msg
          )
        );
      }

    } catch (error) {
      console.error("AI error:", error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
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

  const handleNewChat = () => {
    setMessages([]);
    setInputValue("");
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
        : <ChatMessagesView 
            messages={messages} 
            sessionTitle={sessionData.data?.title || "Untitled"} // Add this prop
          />}

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        entityId={activeEntity?.id}
        entityType={activeEntity?.type}
        onNoteBadgeClick={handleNoteBadgeClick}
      />
    </div>
  );
}
