import { commands as miscCommands } from "@hypr/plugin-misc";
import Renderer from "@hypr/tiptap/renderer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import type { UIMessage } from "@hypr/utils/ai";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { type FC, useEffect, useState } from "react";
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
        let html = await miscCommands.opinionatedMdToHtml(content);

        // Clean up empty paragraphs like reference code
        html = html
          .replace(/<p>\s*<\/p>/g, "")
          .replace(/<p>\u00A0<\/p>/g, "")
          .replace(/<p>&nbsp;<\/p>/g, "")
          .replace(/<p>\s+<\/p>/g, "")
          .replace(/<p> <\/p>/g, "")
          .trim();

        setDisplayHtml(html);
      } catch (error) {
        console.error("Failed to convert markdown:", error);
        setDisplayHtml(content);
      }
    };

    if (content.trim()) {
      processContent();
    }
  }, [content, isHtml]);

  return (
    <>
      <style>
        {`
        /* Styles matching reference code for inline markdown text rendering */
        .markdown-text-container .tiptap-normal {
          font-size: 0.875rem !important;
          line-height: 1.5 !important;
          padding: 0 !important;
          color: rgb(38 38 38) !important;
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        .markdown-text-container .tiptap-normal * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        .markdown-text-container .tiptap-normal p {
          margin: 0 0 8px 0 !important;
        }
        
        .markdown-text-container .tiptap-normal p:last-child {
          margin-bottom: 0 !important;
        }
        
        .markdown-text-container .tiptap-normal strong {
          font-weight: 600 !important;
        }
        
        .markdown-text-container .tiptap-normal em {
          font-style: italic !important;
        }
        
        .markdown-text-container .tiptap-normal a {
          color: rgb(59 130 246) !important;
          text-decoration: underline !important;
        }
        
        .markdown-text-container .tiptap-normal code {
          background-color: rgb(245 245 245) !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          font-family: ui-monospace, SFMono-Regular, Consolas, monospace !important;
          font-size: 0.8em !important;
        }
        
        .markdown-text-container .tiptap-normal ul, 
        .markdown-text-container .tiptap-normal ol {
          margin: 4px 0 !important;
          padding-left: 1.2rem !important;
        }
        
        .markdown-text-container .tiptap-normal li {
          margin-bottom: 2px !important;
        }
        
        /* Selection highlight */
        .markdown-text-container .tiptap-normal ::selection {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .markdown-text-container .tiptap-normal ::-moz-selection {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        /* Mention styles for messages */
        .markdown-text-container .mention,
        .markdown-text-container a.mention {
          color: #3b82f6 !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          border-radius: 0.25rem !important;
          background-color: rgba(59, 130, 246, 0.08) !important;
          padding: 0.1rem 0.25rem !important;
          font-size: 0.9em !important;
          cursor: default !important;
          pointer-events: none !important;
          display: inline-block !important;
        }
        
        .markdown-text-container .mention.selection-ref {
          background-color: rgba(59, 130, 246, 0.08) !important;
          color: #3b82f6 !important;
        }
        `}
      </style>
      <div className="markdown-text-container select-text">
        <Renderer initialContent={displayHtml} />
      </div>
    </>
  );
};

export const UIMessageComponent: FC<UIMessageComponentProps> = ({
  message,
  sessionTitle,
  hasEnhancedNote,
  onApplyMarkdown,
}) => {
  const isUser = message.role === "user";

  // Extract text content from parts
  const getTextContent = () => {
    if (!message.parts || message.parts.length === 0) {
      return "";
    }

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
      <div className="w-full flex justify-end">
        <div className="max-w-[80%]">
          <div className="border border-input rounded-lg overflow-clip bg-white">
            <div className="px-3 py-2.5">
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
    <div className="w-full space-y-4">
      {message.parts?.map((part, index) => {
        // Text content - parse for markdown blocks
        if (part.type === "text" && part.text) {
          const parsedParts = parseMarkdownBlocks(part.text);

          return (
            <div key={`${message.id}-text-${index}`} className="space-y-4">
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
          if (
            (toolPart.state === "input-streaming" || toolPart.state === "input-available")
          ) {
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
                        <Loader2
                          size={16}
                          className="animate-spin"
                          color="rgb(115 115 115)"
                        />
                        <span style={{ fontWeight: "400", flex: 1, textAlign: "left" }}>
                          {toolPart.state === "input-streaming" ? "Calling" : "Called"} tool: {toolName}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-0">
                      {toolPart.input && (
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "rgb(107 114 128)",
                              marginBottom: "6px",
                            }}
                          >
                            Input:
                          </div>
                          <pre
                            style={{
                              backgroundColor: "rgb(249 250 251)",
                              border: "1px solid rgb(229 231 235)",
                              borderRadius: "6px",
                              padding: "8px 12px",
                              margin: 0,
                              paddingLeft: "24px",
                              fontSize: "0.6875rem",
                              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxHeight: "200px",
                              overflow: "auto",
                              color: "rgb(75 85 99)",
                              lineHeight: 1.4,
                            }}
                          >
                            {JSON.stringify(toolPart.input, null, 2)}
                          </pre>
                        </div>
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
                        <Check size={16} color="rgb(115 115 115)" />
                        <span style={{ fontWeight: "400", flex: 1, textAlign: "left" }}>
                          Tool finished: {toolName}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-3 pb-0">
                      {/* Show input */}
                      {toolPart.input && (
                        <div style={{ marginBottom: "12px" }}>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "rgb(107 114 128)",
                              marginBottom: "6px",
                            }}
                          >
                            Input:
                          </div>
                          <pre
                            style={{
                              backgroundColor: "rgb(249 250 251)",
                              border: "1px solid rgb(229 231 235)",
                              borderRadius: "6px",
                              padding: "8px 12px",
                              margin: 0,
                              paddingLeft: "24px",
                              fontSize: "0.6875rem",
                              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxHeight: "200px",
                              overflow: "auto",
                              color: "rgb(75 85 99)",
                              lineHeight: 1.4,
                            }}
                          >
                            {JSON.stringify(toolPart.input, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Show output */}
                      {toolPart.output && (
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              color: "rgb(107 114 128)",
                              marginBottom: "6px",
                            }}
                          >
                            Output:
                          </div>
                          <pre
                            style={{
                              backgroundColor: "rgb(249 250 251)",
                              border: "1px solid rgb(229 231 235)",
                              borderRadius: "6px",
                              padding: "8px 12px",
                              margin: 0,
                              paddingLeft: "24px",
                              fontSize: "0.6875rem",
                              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxHeight: "200px",
                              overflow: "auto",
                              color: "rgb(75 85 99)",
                              lineHeight: 1.4,
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
                  <AlertCircle size={16} color="rgb(185 28 28)" />
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
