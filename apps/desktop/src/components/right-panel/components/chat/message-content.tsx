import { commands as miscCommands } from "@hypr/plugin-misc";
import Renderer from "@hypr/tiptap/renderer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { PencilRuler } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownCard } from "./markdown-card";
import { Message } from "./types";

interface MessageContentProps {
  message: Message;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
}

function ToolDetailsRenderer({ details }: { details: any }) {
  if (!details) {
    return (
      <div
        style={{
          color: "rgb(156 163 175)",
          fontSize: "0.75rem",
          fontStyle: "italic",
          paddingLeft: "24px",
        }}
      >
        No details available...
      </div>
    );
  }

  return (
    <div
      style={{
        paddingLeft: "24px",
        fontSize: "0.75rem",
        color: "rgb(75 85 99)",
      }}
    >
      <pre
        style={{
          backgroundColor: "transparent",
          border: "none",
          borderRadius: "6px",
          padding: "8px 12px",
          margin: 0,
          fontSize: "0.6875rem",
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: "200px",
          overflow: "auto",
          lineHeight: 1.4,
        }}
      >
        {typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}
      </pre>
    </div>
  );
}

function MarkdownText({ content, htmlContent }: { content: string; htmlContent?: string }) {
  const [displayHtml, setDisplayHtml] = useState<string>("");

  useEffect(() => {
    const processContent = async () => {
      // If we have HTML content with mentions, use it directly
      if (htmlContent) {
        setDisplayHtml(htmlContent);
        return;
      }

      // Otherwise, convert markdown as usual
      try {
        let html = await miscCommands.opinionatedMdToHtml(content);

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

    if (content.trim() || htmlContent) {
      processContent();
    }
  }, [content, htmlContent]);

  return (
    <>
      <style>
        {`
        /* Styles for inline markdown text rendering */
        .markdown-text-container .tiptap-normal {
          font-size: 0.875rem !important;
          line-height: 1.5 !important;
          padding: 0 !important;
          color: rgb(38 38 38) !important; /* text-neutral-800 */
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
          color: rgb(59 130 246) !important; /* text-blue-500 */
          text-decoration: underline !important;
        }
        
        .markdown-text-container .tiptap-normal code {
          background-color: rgb(245 245 245) !important; /* bg-neutral-100 */
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
}

export function MessageContent({ message, sessionTitle, hasEnhancedNote, onApplyMarkdown }: MessageContentProps) {
  let htmlContent: string | undefined;
  if (message.isUser && message.toolDetails) {
    try {
      const details = typeof message.toolDetails === "string"
        ? JSON.parse(message.toolDetails)
        : message.toolDetails;
      htmlContent = details.htmlContent;
    } catch (error) {
      console.error("Failed to parse HTML content from toolDetails:", error);
    }
  }
  if (message.type === "tool-start") {
    const hasToolDetails = message.toolDetails;

    if (hasToolDetails) {
      return (
        <div
          style={{
            backgroundColor: "rgb(250 250 250)",
            border: "1px solid rgb(229 229 229)",
            borderRadius: "6px",
            padding: "12px 16px",
          }}
        >
          <Accordion type="single" collapsible className="border-none">
            <AccordionItem value="tool-start-details" className="border-none">
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
                    Called tool: {message.content}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-0">
                <ToolDetailsRenderer details={message.toolDetails} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      );
    } else {
      return (
        <div
          style={{
            backgroundColor: "rgb(250 250 250)",
            border: "1px solid rgb(229 229 229)",
            borderRadius: "6px",
            padding: "12px 16px",
          }}
        >
          <div
            style={{
              color: "rgb(115 115 115)",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <PencilRuler size={16} color="rgb(115 115 115)" />
            <span style={{ fontWeight: "400" }}>
              Called tool: {message.content}
            </span>
          </div>
        </div>
      );
    }
  }

  if (message.type === "tool-result") {
    return (
      <div
        style={{
          backgroundColor: "rgb(248 248 248)",
          border: "1px solid rgb(224 224 224)",
          borderRadius: "6px",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            color: "rgb(115 115 115)",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <PencilRuler size={16} color="rgb(115 115 115)" />
          <span style={{ fontWeight: "400" }}>
            {message.content}
          </span>
        </div>
      </div>
    );
  }

  if (message.type === "tool-error") {
    return (
      <div
        style={{
          backgroundColor: "rgb(252 252 252)",
          border: "1px solid rgb(229 229 229)",
          borderRadius: "6px",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            color: "rgb(115 115 115)",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <PencilRuler size={16} color="rgb(115 115 115)" />
          <span style={{ fontWeight: "400" }}>
            Tool Error: {message.content}
          </span>
        </div>
      </div>
    );
  }

  if (!message.parts || message.parts.length === 0) {
    return <MarkdownText content={message.content} htmlContent={htmlContent} />;
  }

  return (
    <div className="space-y-1">
      {message.parts.map((part, index) => (
        <div key={index}>
          {part.type === "text"
            ? <MarkdownText content={part.content} htmlContent={index === 0 ? htmlContent : undefined} />
            : (
              <MarkdownCard
                content={part.content}
                isComplete={part.isComplete || false}
                sessionTitle={sessionTitle}
                hasEnhancedNote={hasEnhancedNote}
                onApplyMarkdown={onApplyMarkdown}
              />
            )}
        </div>
      ))}
    </div>
  );
}
