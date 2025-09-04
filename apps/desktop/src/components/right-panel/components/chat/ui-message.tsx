import { type FC, useEffect, useState } from "react";
import type { UIMessage } from "@hypr/utils/ai";
import Renderer from "@hypr/tiptap/renderer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Loader2, PencilRuler } from "lucide-react";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { parseMarkdownBlocks } from "../../utils/markdown-parser";
import { MarkdownCard } from "./markdown-card";

interface UIMessageComponentProps {
  message: UIMessage;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (content: string) => void;
}

// Component for rendering markdown/HTML content
const TextContent: FC<{ content: string; isHtml?: boolean }> = ({ content, isHtml }) => {
  const [displayHtml, setDisplayHtml] = useState<string>("");

  useEffect(() => {
    const processContent = async () => {
      if (isHtml) {
        setDisplayHtml(content);
        return;
      }

      // Convert markdown to HTML
      try {
        const html = await miscCommands.opinionatedMdToHtml(content);
        setDisplayHtml(html);
      } catch (error) {
        console.error("Failed to convert markdown:", error);
        setDisplayHtml(content);
      }
    };

    if (content) {
      processContent();
    }
  }, [content, isHtml]);

  return (
    <div className="markdown-text-container select-text">
      <Renderer initialContent={displayHtml} />
    </div>
  );
};

export const UIMessageComponent: FC<UIMessageComponentProps> = ({ 
  message, 
  sessionTitle, 
  hasEnhancedNote, 
  onApplyMarkdown 
}) => {
  const isUser = message.role === "user";
  
  // Extract text content from parts
  const getTextContent = () => {
    if (!message.parts || message.parts.length === 0) return "";
    
    const textParts = message.parts
      .filter(part => part.type === "text")
      .map(part => part.text || "")
      .join("");
    
    return textParts;
  };


  // User message styling
  if (isUser) {
    // Check for HTML content in metadata (for mentions/selections)
    const htmlContent = (message.metadata as any)?.htmlContent;
    const textContent = getTextContent();
    
    return (
      <div className="w-full mb-4 flex justify-end">
        <div className="max-w-[80%]">
          <div className="border border-input rounded-lg overflow-clip bg-white">
            <div className="px-3 py-2">
              <TextContent content={htmlContent || textContent} isHtml={!!htmlContent} />
            </div>
          </div>
          {(message as any).createdAt && (
            <div className="text-xs text-neutral-500 mt-1 text-right">
              {new Date((message as any).createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant message - render parts
  return (
    <div className="w-full mb-4 space-y-2">
      {message.parts?.map((part, index) => {
        // Text content - parse for markdown blocks
        if (part.type === "text" && part.text) {
          const parsedParts = parseMarkdownBlocks(part.text);
          
          return (
            <div key={`${message.id}-text-${index}`} className="space-y-1">
              {parsedParts.map((parsedPart, pIndex) => {
                if (parsedPart.type === "markdown") {
                  return (
                    <MarkdownCard
                      key={`md-${pIndex}`}
                      content={parsedPart.content}
                      isComplete={parsedPart.isComplete || false}
                      sessionTitle={sessionTitle}
                      hasEnhancedNote={hasEnhancedNote}
                      onApplyMarkdown={onApplyMarkdown}
                    />
                  );
                }
                // Regular text
                return (
                  <div key={`text-${pIndex}`}>
                    <TextContent content={parsedPart.content} />
                  </div>
                );
              })}
            </div>
          );
        }

        // Handle tool parts - check for dynamic tools or specific tool types
        if (part.type === "dynamic-tool" || part.type?.startsWith("tool-")) {
          const toolPart = part as any;
          
          // Extract tool name - either from toolName field (dynamic) or from type (specific)
          const toolName = toolPart.toolName || part.type.replace("tool-", "");
          
          // Tool execution start (input streaming or available)
          if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
            return (
              <div
                key={`${message.id}-tool-${index}`}
                style={{
                  backgroundColor: "rgb(250 250 250)",
                  border: "1px solid rgb(229 229 229)",
                  borderRadius: "6px",
                  padding: "12px 16px",
                }}
              >
                <Accordion type="single" collapsible className="border-none">
                  <AccordionItem value={`tool-${index}`} className="border-none">
                    <AccordionTrigger className="hover:no-underline p-0 h-auto [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-gray-400">
                      <div
                        style={{
                          color: "rgb(115 115 115)",
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                        }}
                      >
                        <PencilRuler size={16} color="rgb(115 115 115)" />
                        <span style={{ fontWeight: "400", flex: 1, textAlign: "left" }}>
                          {toolPart.state === "input-streaming" ? "Calling" : "Called"} tool: {toolName}
                        </span>
                        {/* Loading spinner */}
                        <Loader2 
                          size={14} 
                          className="animate-spin" 
                          color="rgb(115 115 115)" 
                          style={{ marginRight: "8px" }}
                        />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-0">
                      {toolPart.input && (
                        <pre
                          style={{
                            paddingLeft: "24px",
                            fontSize: "0.6875rem",
                            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            maxHeight: "200px",
                            overflow: "auto",
                            color: "rgb(75 85 99)",
                          }}
                        >
                          {JSON.stringify(toolPart.input, null, 2)}
                        </pre>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          }

          // Tool completion (output available)
          if (toolPart.state === "output-available") {
            return (
              <div
                key={`${message.id}-result-${index}`}
                style={{
                  backgroundColor: "rgb(248 248 248)",
                  border: "1px solid rgb(224 224 224)",
                  borderRadius: "6px",
                  padding: "12px 16px",
                }}
              >
                <Accordion type="single" collapsible className="border-none">
                  <AccordionItem value={`tool-result-${index}`} className="border-none">
                    <AccordionTrigger className="hover:no-underline p-0 h-auto [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-gray-400">
                      <div
                        style={{
                          color: "rgb(115 115 115)",
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                        }}
                      >
                        <PencilRuler size={16} color="rgb(115 115 115)" />
                        <span style={{ fontWeight: "400", flex: 1, textAlign: "left" }}>
                          Tool finished: {toolName}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-0">
                      {/* Show input */}
                      {toolPart.input && (
                        <div style={{ marginBottom: "12px" }}>
                          <div style={{ 
                            fontSize: "0.75rem", 
                            fontWeight: "500", 
                            color: "rgb(107 114 128)",
                            marginBottom: "4px",
                            paddingLeft: "24px"
                          }}>
                            Input:
                          </div>
                          <pre
                            style={{
                              paddingLeft: "24px",
                              fontSize: "0.6875rem",
                              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxHeight: "200px",
                              overflow: "auto",
                              color: "rgb(75 85 99)",
                            }}
                          >
                            {JSON.stringify(toolPart.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {/* Show output */}
                      {toolPart.output && (
                        <div>
                          <div style={{ 
                            fontSize: "0.75rem", 
                            fontWeight: "500", 
                            color: "rgb(107 114 128)",
                            marginBottom: "4px",
                            paddingLeft: "24px"
                          }}>
                            Output:
                          </div>
                          <pre
                            style={{
                              paddingLeft: "24px",
                              fontSize: "0.6875rem",
                              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxHeight: "200px",
                              overflow: "auto",
                              color: "rgb(75 85 99)",
                            }}
                          >
                            {JSON.stringify(toolPart.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          }

          // Tool error
          if (toolPart.state === "output-error") {
            return (
              <div
                key={`${message.id}-error-${index}`}
                style={{
                  backgroundColor: "rgb(254 242 242)",
                  border: "1px solid rgb(254 202 202)",
                  borderRadius: "6px",
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    color: "rgb(185 28 28)",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <PencilRuler size={16} color="rgb(185 28 28)" />
                  <span style={{ fontWeight: "400" }}>
                    Tool error: {toolName}
                  </span>
                </div>
                {toolPart.errorText && (
                  <div style={{ marginTop: "8px", fontSize: "0.8125rem", color: "rgb(153 27 27)" }}>
                    {toolPart.errorText}
                  </div>
                )}
              </div>
            );
          }
        }

        return null;
      })}
    </div>
  );
};