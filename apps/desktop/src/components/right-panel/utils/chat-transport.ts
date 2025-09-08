import type { UIMessage } from "@hypr/utils/ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  type ChatRequestOptions,
  type ChatTransport,
  dynamicTool,
  experimental_createMCPClient,
  modelProvider,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
  type UIMessageChunk,
} from "@hypr/utils/ai";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as mcpCommands } from "@hypr/plugin-mcp";
import { fetch as tauriFetch } from "@hypr/utils";
import { getLicenseKey } from "tauri-plugin-keygen-api";
import { z } from "zod";

// Import the custom tools
import { createEditEnhancedNoteTool } from "./tools/edit_enhanced_note";
import { createSearchSessionDateRangeTool } from "./tools/search_session_date_range";
import { createSearchSessionTool } from "./tools/search_session_multi_keywords";
import { buildVercelToolsFromMcp } from "./mcp-http-wrapper";
import { prepareMessagesForAI } from "./chat-utils";

interface CustomChatTransportOptions {
  sessionId: string | null;
  userId: string | null;
  sessionData?: any;
  selectionData?: any;
  sessions?: any;
  getLicense?: { data?: { valid?: boolean } };
  mentionedContent?: Array<{ id: string; type: string; label: string }>;
}

export class CustomChatTransport implements ChatTransport<UIMessage> {
  private options: CustomChatTransportOptions;
  private allMcpClients: any[] = [];
  private hyprMcpClient: Client | null = null;

  constructor(options: CustomChatTransportOptions) {
    this.options = options;
  }

  async initializeModel() {
    // Always get fresh model with current connection settings
    const provider = await modelProvider();
    const model = provider.languageModel("defaultModel");
   
    
    return model;
  }

  private async loadMCPTools() {
    let newMcpTools: Record<string, any> = {};
    let hyprMcpTools: Record<string, any> = {};

    // Get LLM connection for tool detection
    const llmConnection = await connectorCommands.getLlmConnection();
    const { type } = llmConnection;
    const apiBase = llmConnection.connection?.api_base;
    const customModel = await connectorCommands.getCustomLlmModel();
    
    // Determine model ID based on connection type
    const modelId = type === "Custom" && customModel ? customModel : "gpt-4";
    
    const shouldUseTools = 
      modelId === "gpt-4.1" || 
      modelId === "openai/gpt-4.1" ||
      modelId === "anthropic/claude-sonnet-4" ||
      modelId === "openai/gpt-4o" ||
      modelId === "gpt-4o" ||
      apiBase?.includes("pro.hyprnote.com") ||
      modelId === "openai/gpt-5" ||
      type === "HyprLocal";

    if (!shouldUseTools) {
      return { newMcpTools, hyprMcpTools };
    }

    // Load MCP servers
    const mcpServers = await mcpCommands.getServers();
    const enabledServers = mcpServers.filter((server) => server.enabled);

    // Load Hyprnote cloud MCP if applicable
    if (apiBase?.includes("pro.hyprnote.com") && this.options.getLicense?.data?.valid) {
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
        this.hyprMcpClient = new Client({
          name: "hyprmcp",
          version: "0.1.0",
        });
        await this.hyprMcpClient.connect(transport);
        hyprMcpTools = await buildVercelToolsFromMcp(this.hyprMcpClient);
      } catch (error) {
        console.error("Error creating hyprmcp client:", error);
      }
    }

    // Load other MCP tools
    for (const server of enabledServers) {
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
            onerror: (error) => console.log("mcp client error:", error),
            onclose: () => console.log("mcp client closed"),
          },
        });
        this.allMcpClients.push(mcpClient);

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

    return { newMcpTools, hyprMcpTools };
  }

  private async getTools() {
    const { newMcpTools, hyprMcpTools } = await this.loadMCPTools();

    // Get LLM connection for type check
    const llmConnection = await connectorCommands.getLlmConnection();
    const { type } = llmConnection;
    const apiBase = llmConnection.connection?.api_base;
    const customModel = await connectorCommands.getCustomLlmModel();
    
    // Determine model ID based on connection type
    const modelId = type === "Custom" && customModel ? customModel : "gpt-4";
    
    const shouldUseTools = 
      modelId === "gpt-4.1" || 
      modelId === "openai/gpt-4.1" ||
      modelId === "anthropic/claude-sonnet-4" ||
      modelId === "openai/gpt-4o" ||
      modelId === "gpt-4o" ||
      apiBase?.includes("pro.hyprnote.com") ||
      modelId === "openai/gpt-5" ||
      type === "HyprLocal";

    // Create base tools
    const searchTool = createSearchSessionTool(this.options.userId);
    const searchSessionDateRangeTool = createSearchSessionDateRangeTool(this.options.userId);
    const editEnhancedNoteTool = this.options.selectionData
      ? createEditEnhancedNoteTool({
          sessionId: this.options.sessionId,
          sessions: this.options.sessions || {}, // Pass empty object if sessions not available
          selectionData: this.options.selectionData,
        })
      : null;

    const baseTools = {
      ...(editEnhancedNoteTool && { edit_enhanced_note: editEnhancedNoteTool }),
      search_sessions_date_range: searchSessionDateRangeTool,
      search_sessions_multi_keywords: searchTool,
    };

    return {
      ...(shouldUseTools && { ...hyprMcpTools, ...newMcpTools }),
      ...(shouldUseTools && baseTools),
    };
  }


  async sendMessages(
    options: {
      chatId: string;
      messages: UIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    try {
      // Initialize model if not already done
      const model = await this.initializeModel();

      // Check if the last message has selection data in metadata
      // This is more reliable than relying on transport options being updated in time
      const lastMessage = options.messages[options.messages.length - 1];
      // Type assertion needed because metadata is typed as {} by default
      const messageMetadata = lastMessage?.metadata as any;
      if (messageMetadata?.selectionData) {
        this.options.selectionData = messageMetadata.selectionData;
      }

      // Get tools - this will use the latest options including any selection data
      // Tools are loaded here after any option updates from useChat2
      const tools = await this.getTools();
    

      // Prepare messages with system context and enhanced user message
      const preparedMessages = await prepareMessagesForAI(options.messages, {
        sessionId: this.options.sessionId,
        userId: this.options.userId,
        sessionData: this.options.sessionData,
        selectionData: this.options.selectionData,
        mentionedContent: this.options.mentionedContent,
      });

    

      // Stream text with tools
      const result = streamText({
        model,
        messages: preparedMessages,
        abortSignal: options.abortSignal,
        stopWhen: stepCountIs(5),
        tools,
        toolChoice: "auto",
        experimental_transform: smoothStream({
          delayInMs: 70,
          chunking: "word",
        }),
        onFinish: () => {
          // Clean up MCP clients
          for (const client of this.allMcpClients) {
            client.close();
          }
          if (this.hyprMcpClient) {
            this.hyprMcpClient.close();
          }
          this.allMcpClients = [];
          this.hyprMcpClient = null;
        },
      });

      // Convert to UI message stream
      return result.toUIMessageStream({
        onError: (error) => {
          if (error == null) {
            return "unknown_error";
          }
          if (typeof error === "string") {
            return error;
          }
          if (error instanceof Error) {
            return error.message;
          }
          return JSON.stringify(error);
        },
      });
    } catch (error) {
      console.error("Transport error:", error);
      throw error;
    }
  }

  async reconnectToStream(
    _options: {
      chatId: string;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    // We don't support reconnecting to streams yet
    return null;
  }

  // Helper method to update options (for selection data, session data, etc.)
  updateOptions(newOptions: Partial<CustomChatTransportOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  // Clean up method
  cleanup() {
    for (const client of this.allMcpClients) {
      client.close();
    }
    if (this.hyprMcpClient) {
      this.hyprMcpClient.close();
    }
    this.allMcpClients = [];
    this.hyprMcpClient = null;
  }
}