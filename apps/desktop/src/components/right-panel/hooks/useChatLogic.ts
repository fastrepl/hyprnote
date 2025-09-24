import { showProGateModal } from "@/components/pro-gate-modal/service";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SelectionData } from "@/contexts/right-panel";

import { useLicense } from "@/hooks/use-license";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as mcpCommands } from "@hypr/plugin-mcp";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { fetch as tauriFetch } from "@hypr/utils";
import {
  dynamicTool,
  experimental_createMCPClient,
  modelProvider,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
} from "@hypr/utils/ai";
import { useSessions } from "@hypr/utils/contexts";
import { useQueryClient } from "@tanstack/react-query";
import { getLicenseKey } from "tauri-plugin-keygen-api";
import { z } from "zod";
import type { ActiveEntityInfo, Message } from "../types/chat-types";
import { prepareMessageHistory } from "../utils/chat-utils";
import { parseMarkdownBlocks } from "../utils/markdown-parser";
import { buildVercelToolsFromMcp } from "../utils/mcp-http-wrapper";
import { createEditEnhancedNoteTool } from "../utils/tools/edit_enhanced_note";
import { createSearchSessionDateRangeTool } from "../utils/tools/search_session_date_range";
import { createSearchSessionTool } from "../utils/tools/search_session_multi_keywords";

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
  const [isStreamingText, setIsStreamingText] = useState(false);
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessions = useSessions((state) => state.sessions);
  const { getLicense } = useLicense();
  const queryClient = useQueryClient();

  // Reset generation state and abort ongoing streams when session changes
  useEffect(() => {
    // Abort any ongoing generation when session changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset generation state for new session
    setIsGenerating(false);
    setIsStreamingText(false);
    isGeneratingRef.current = false;
  }, [sessionId]);

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

      const { session, showRaw } = sessionStore.getState();

      const hasEnhancedNote = !!session.enhanced_memo_html;

      if (!hasEnhancedNote) {
        sessionStore.getState().updateRawNote(html);
      } else {
        if (showRaw) {
          sessionStore.getState().updateRawNote(html);
        } else {
          sessionStore.getState().updateEnhancedNote(html);
        }
      }
    } catch (error) {
      console.error("Failed to apply markdown content:", error);
    }
  };

  const processUserMessage = async (
    content: string,
    analyticsEvent: string,
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
    selectionData?: SelectionData,
    htmlContent?: string,
  ) => {
    if (!content.trim() || isGenerating) {
      return;
    }

    const userMessageCount = messages.filter(msg => msg.isUser).length;

    if (userMessageCount >= 4 && !getLicense.data?.valid) {
      if (userId) {
        await analyticsCommands.event({
          event: "pro_license_required_chat",
          distinct_id: userId,
        });
      }
      await showProGateModal("chat");
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
    isGeneratingRef.current = true;

    const groupId = await getChatGroupId();

    // Prepare toolDetails before creating the message
    let toolDetails = null;
    if (htmlContent && (mentionedContent?.length || selectionData)) {
      toolDetails = { htmlContent };
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: content,
      isUser: true,
      timestamp: new Date(),
      type: "text-delta",
      toolDetails: toolDetails, // Include toolDetails in the message object
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    await dbCommands.upsertChatMessage({
      id: userMessage.id,
      group_id: groupId,
      created_at: userMessage.timestamp.toISOString(),
      role: "User",
      content: userMessage.content.trim(),
      type: "text-delta",
      tool_details: toolDetails ? JSON.stringify(toolDetails) : null,
    });

    const aiMessageId = crypto.randomUUID();

    try {
      const provider = await modelProvider();
      const model = provider.languageModel("defaultModel");

      await queryClient.invalidateQueries({ queryKey: ["llm-connection"] });
      await new Promise(resolve => setTimeout(resolve, 100));

      const llmConnection = await connectorCommands.getLlmConnection();
      const { type } = llmConnection;
      const apiBase = llmConnection.connection?.api_base;

      let newMcpTools: Record<string, any> = {};
      let hyprMcpTools: Record<string, any> = {};
      let mcpToolsArray: any[] = [];
      const allMcpClients: any[] = [];
      let hyprMcpClient: Client | null = null;

      const shouldUseTools = model.modelId === "gpt-4.1" || model.modelId === "openai/gpt-4.1"
        || model.modelId === "anthropic/claude-sonnet-4"
        || model.modelId === "openai/gpt-4o"
        || model.modelId === "gpt-4o"
        || apiBase?.includes("pro.hyprnote.com")
        || model.modelId === "openai/gpt-5";

      if (shouldUseTools) {
        const mcpServers = await mcpCommands.getServers();
        const enabledSevers = mcpServers.filter((server) => server.enabled);

        if (apiBase?.includes("pro.hyprnote.com") && getLicense.data?.valid) {
          try {
            const licenseKey = await getLicenseKey();

            const transport = new StreamableHTTPClientTransport(
              new URL("https://pro.hyprnote.com/mcp"),
              {
                fetch: tauriFetch,
                requestInit: {
                  headers: {
                    "x-hyprnote-license-key": licenseKey || "",
                  },
                },
              },
            );
            hyprMcpClient = new Client({
              name: "hyprmcp",
              version: "0.1.0",
            });

            await hyprMcpClient.connect(transport);

            hyprMcpTools = await buildVercelToolsFromMcp(hyprMcpClient);
          } catch (error) {
            console.error("Error creating and adding hyprmcp client:", error);
          }
        }

        for (const server of enabledSevers) {
          try {
            const mcpClient = await experimental_createMCPClient({
              transport: {
                type: "sse",
                url: server.url,
                ...(server.headerKey && server.headerValue && {
                  headers: {
                    [server.headerKey]: server.headerValue,
                  },
                }),
                onerror: (error) => {
                  console.log("mcp client error: ", error);
                },
                onclose: () => {
                  console.log("mcp client closed");
                },
              },
            });
            allMcpClients.push(mcpClient);

            const tools = await mcpClient.tools();
            for (const [toolName, tool] of Object.entries(tools as Record<string, any>)) {
              newMcpTools[toolName] = dynamicTool({
                description: tool.description,
                inputSchema: tool.inputSchema || z.any(),
                execute: tool.execute,
              });
            }
          } catch (error) {
            console.error("Error creating MCP client:", error);
          }
        }

        mcpToolsArray = Object.keys(newMcpTools).length > 0
          ? Object.entries(newMcpTools).map(([name, tool]) => ({
            name,
            description: tool.description || `Tool: ${name}`,
            inputSchema: tool.inputSchema || "No input schema provided",
          }))
          : [];

        for (const [toolKey, tool] of Object.entries(hyprMcpTools)) {
          mcpToolsArray.push({
            name: toolKey,
            description: tool.description || `Tool: ${tool.name}`,
            inputSchema: tool.inputSchema || "No input schema provided",
          });
        }
      }

      // Create tools using the refactored tool factories
      const searchTool = createSearchSessionTool(userId);
      const editEnhancedNoteTool = createEditEnhancedNoteTool({
        sessionId,
        sessions,
        selectionData,
      });
      const searchSessionDateRangeTool = createSearchSessionDateRangeTool(userId);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const baseTools = {
        ...(selectionData && { edit_enhanced_note: editEnhancedNoteTool }),
        search_sessions_date_range: searchSessionDateRangeTool,
        search_sessions_multi_keywords: searchTool,
      };

      const { fullStream } = streamText({
        model,
        messages: await prepareMessageHistory(
          messages,
          content,
          mentionedContent,
          model.modelId,
          mcpToolsArray,
          sessionData,
          sessionId,
          userId,
          apiBase,
          selectionData, // Pass selectionData to prepareMessageHistory
        ),
        stopWhen: stepCountIs(5),
        tools: {
          ...(shouldUseTools && { ...hyprMcpTools, ...newMcpTools }),
          ...(shouldUseTools && baseTools),
          ...(type === "HyprLocal" && { progress_update: tool({ inputSchema: z.any() }) }),
        },
        onError: (error) => {
          console.error("On Error Catch:", error);
          setIsGenerating(false);
          isGeneratingRef.current = false;
          throw error;
        },
        onFinish: () => {
          for (const client of allMcpClients) {
            client.close();
          }
          // close hyprmcp client
          hyprMcpClient?.close();
        },
        abortSignal: abortController.signal,
        experimental_transform: smoothStream({
          delayInMs: 30,
          chunking: "word",
        }),
      });

      let aiResponse = "";
      let didInitializeAiResponse = false;
      let currentAiTextMessageId: string | null = null;
      let lastChunkType: string | null = null;

      for await (const chunk of fullStream) {
        if (lastChunkType === "text-delta" && chunk.type !== "text-delta" && chunk.type !== "finish-step") {
          setIsStreamingText(false); // Text streaming has stopped, more content coming

          await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (chunk.type === "text-delta") {
          setIsStreamingText(true);

          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];

            if (didInitializeAiResponse && lastMessage && lastMessage.type === "text-delta") {
              // Same type (text) -> update existing message

              aiResponse += chunk.text;
              currentAiTextMessageId = lastMessage.id;
              const parts = parseMarkdownBlocks(aiResponse);

              return prev.map(msg =>
                msg.id === lastMessage.id
                  ? { ...msg, content: aiResponse, parts, type: "text-delta" }
                  : msg
              );
            } else {
              if (!didInitializeAiResponse) {
                aiResponse = "";
                didInitializeAiResponse = true;
              }

              aiResponse += chunk.text;
              const parts = parseMarkdownBlocks(aiResponse);

              // Different type -> create new message
              const newTextMessage: Message = {
                id: crypto.randomUUID(),
                content: aiResponse,
                isUser: false,
                timestamp: new Date(),
                type: "text-delta",
                parts,
              };

              currentAiTextMessageId = newTextMessage.id;
              return [...prev, newTextMessage];
            }
          });
        }

        if (chunk.type === "tool-call" && !(chunk.toolName === "progress_update" && type === "HyprLocal")) {
          // Save accumulated AI text before processing tool

          if (currentAiTextMessageId && aiResponse.trim()) {
            const saveAiText = async () => {
              try {
                await dbCommands.upsertChatMessage({
                  id: currentAiTextMessageId!,
                  group_id: groupId,
                  created_at: new Date().toISOString(),
                  role: "Assistant",
                  type: "text-delta",
                  content: aiResponse.trim(),
                  tool_details: null,
                });
              } catch (error) {
                console.error("Failed to save AI text:", error);
              }
            };
            saveAiText();
            currentAiTextMessageId = null; // Reset
          }

          didInitializeAiResponse = false;

          const toolStartMessage: Message = {
            id: crypto.randomUUID(),
            content: `${chunk.toolName}`,
            isUser: false,
            timestamp: new Date(),
            type: "tool-start",
            toolDetails: chunk.input,
          };
          setMessages((prev) => [...prev, toolStartMessage]);

          // save message to db right away
          await dbCommands.upsertChatMessage({
            id: toolStartMessage.id,
            group_id: groupId,
            created_at: toolStartMessage.timestamp.toISOString(),
            role: "Assistant",
            content: toolStartMessage.content,
            type: "tool-start",
            tool_details: JSON.stringify(chunk.input),
          });

          // log if user is using tools in chat
          analyticsCommands.event({
            event: "chat_tool_call",
            distinct_id: userId || "",
          });
        }

        if (chunk.type === "tool-result" && !(chunk.toolName === "progress_update" && type === "HyprLocal")) {
          didInitializeAiResponse = false;

          const toolResultMessage: Message = {
            id: crypto.randomUUID(),
            content: `Tool finished: ${chunk.toolName}`,
            isUser: false,
            timestamp: new Date(),
            type: "tool-result",
          };

          setMessages((prev) => [...prev, toolResultMessage]);

          await dbCommands.upsertChatMessage({
            id: toolResultMessage.id,
            group_id: groupId,
            created_at: toolResultMessage.timestamp.toISOString(),
            role: "Assistant",
            content: toolResultMessage.content,
            type: "tool-result",
            tool_details: null,
          });
        }

        if (chunk.type === "tool-error" && !(chunk.toolName === "progress_update" && type === "HyprLocal")) {
          didInitializeAiResponse = false;
          const toolErrorMessage: Message = {
            id: crypto.randomUUID(),
            content: `Tool error: ${chunk.error}`,
            isUser: false,
            timestamp: new Date(),
            type: "tool-error",
          };
          setMessages((prev) => [...prev, toolErrorMessage]);

          await dbCommands.upsertChatMessage({
            id: toolErrorMessage.id,
            group_id: groupId,
            created_at: toolErrorMessage.timestamp.toISOString(),
            role: "Assistant",
            content: toolErrorMessage.content,
            type: "tool-error",
            tool_details: null,
          });
        }

        lastChunkType = chunk.type;
      }

      if (currentAiTextMessageId && aiResponse.trim()) {
        await dbCommands.upsertChatMessage({
          id: currentAiTextMessageId,
          group_id: groupId,
          created_at: new Date().toISOString(),
          role: "Assistant",
          type: "text-delta",
          content: aiResponse.trim(),
          tool_details: null,
        });
      }

      setIsGenerating(false);
      setIsStreamingText(false);
      isGeneratingRef.current = false;
      abortControllerRef.current = null; // Clear the abort controller on successful completion
    } catch (error) {
      console.error(error);

      let errorMsg = "Unknown error";
      if (typeof error === "string") {
        errorMsg = error;
      } else if (error instanceof Error) {
        errorMsg = error.message || error.name || "Unknown error";
      } else if ((error as any)?.error) {
        errorMsg = (error as any).error;
      } else if ((error as any)?.message) {
        errorMsg = (error as any).message;
      }

      let finalErrorMessage = "";

      if (String(errorMsg).includes("too large")) {
        finalErrorMessage =
          "Sorry, I encountered an error. Please try again. Your transcript or meeting notes might be too large. Please try again with a smaller transcript or meeting notes."
          + "\n\n" + errorMsg;
      } else if (String(errorMsg).includes("Request cancelled") || String(errorMsg).includes("Request canceled")) {
        finalErrorMessage = "Request was cancelled mid-stream. Try again with a different message.";
      } else {
        finalErrorMessage = "Sorry, I encountered an error. Please try again. " + "\n\n" + errorMsg;
      }

      setIsGenerating(false);
      setIsStreamingText(false);
      isGeneratingRef.current = false;
      abortControllerRef.current = null; // Clear the abort controller on error

      // Create error message
      const errorMessage: Message = {
        id: aiMessageId,
        content: finalErrorMessage,
        isUser: false,
        timestamp: new Date(),
        type: "text-delta",
      };

      setMessages((prev) => [...prev, errorMessage]);

      await dbCommands.upsertChatMessage({
        id: aiMessageId,
        group_id: groupId,
        created_at: new Date().toISOString(),
        role: "Assistant",
        content: finalErrorMessage,
        type: "text-delta",
        tool_details: null,
      });
    }
  };

  const handleSubmit = async (
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
    selectionData?: SelectionData,
    htmlContent?: string,
  ) => {
    await processUserMessage(inputValue, "chat_message_sent", mentionedContent, selectionData, htmlContent);
  };

  const handleQuickAction = async (prompt: string) => {
    await processUserMessage(prompt, "chat_quickaction_sent", undefined, undefined);

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

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isGenerating,
    isStreamingText,
    handleSubmit,
    handleQuickAction,
    handleApplyMarkdown,
    handleKeyDown,
    handleStop,
  };
}
