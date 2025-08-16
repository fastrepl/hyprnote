import { commands as miscCommands } from "@hypr/plugin-misc";
import Renderer from "@hypr/tiptap/renderer";
import { useEffect, useState } from "react";
import { MarkdownCard } from "./markdown-card";
import { Message } from "./types";

interface MessageContentProps {
  message: Message;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (markdownContent: string) => void;
}

function MarkdownText({ content }: { content: string }) {
  const [htmlContent, setHtmlContent] = useState<string>("");

  useEffect(() => {
    const convertMarkdown = async () => {
      try {
        let html = await miscCommands.opinionatedMdToHtml(content);

        // Clean up spacing (same as MarkdownCard)
        html = html
          .replace(/<p>\s*<\/p>/g, "")
          .replace(/<p>\u00A0<\/p>/g, "")
          .replace(/<p>&nbsp;<\/p>/g, "")
          .replace(/<p>\s+<\/p>/g, "")
          .replace(/<p> <\/p>/g, "")
          .trim();

        setHtmlContent(html);
      } catch (error) {
        console.error("Failed to convert markdown:", error);
        setHtmlContent(content);
      }
    };

    if (content.trim()) {
      convertMarkdown();
    }
  }, [content]);

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
        `}
      </style>
      <div className="markdown-text-container select-text">
        <Renderer initialContent={htmlContent} />
      </div>
    </>
  );
}

export function MessageContent({ message, sessionTitle, hasEnhancedNote, onApplyMarkdown }: MessageContentProps) {
  
  if ((message.content === "Generating..." || message.content === "tool call started") && message.type === "generating") {
    return (
      <>
        <style>
          {`
            @keyframes thinking-dots {
              0%, 20% { opacity: 0; }
              50% { opacity: 1; }
              100% { opacity: 0; }
            }
            .thinking-dot:nth-child(1) { animation-delay: 0s; }
            .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
            .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
            .thinking-dot {
              animation: thinking-dots 1.2s infinite;
              display: inline-block;
            }
          `}
        </style>
        <div style={{ color: "rgb(115 115 115)", fontSize: "0.875rem", padding: "4px 0" }}>
          <span>Thinking</span>
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
        </div>
      </>
    );
  }


  // ✅ Add special rendering for tool-call messages
  if (message.type === "tool-start") {
    return (
      <div style={{ 
        color: "rgb(115 115 115)", // Same grey as thinking/executing
        fontSize: "0.875rem", 
        padding: "8px 12px",
        backgroundColor: "rgb(250 250 250)", // Very light grey background
        border: "1px solid rgb(229 229 229)", // Subtle grey border
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <div style={{
          width: "4px",
          height: "4px",
          backgroundColor: "rgb(163 163 163)",
          borderRadius: "50%",
          flexShrink: 0
        }} />
        <span style={{ fontWeight: "400" }}>
          Called tool: {message.content}
        </span>
      </div>
    );
  }

  // ✅ Add special rendering for tool-result messages
  if (message.type === "tool-result") {
    return (
      <div style={{ 
        color: "rgb(115 115 115)", // Same grey as thinking/executing
        fontSize: "0.875rem", 
        padding: "8px 12px",
        backgroundColor: "rgb(248 248 248)", // Slightly darker grey background
        border: "1px solid rgb(224 224 224)", // Subtle grey border
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <div style={{
          width: "4px",
          height: "4px",
          backgroundColor: "rgb(163 163 163)",
          borderRadius: "50%",
          flexShrink: 0
        }} />
        <span style={{ fontWeight: "400" }}>
          {message.content}
        </span>
      </div>
    );
  }

  // ✅ Add special rendering for tool-error messages
  if (message.type === "tool-error") {
    return (
      <div style={{ 
        color: "rgb(115 115 115)", // Same grey as thinking/executing
        fontSize: "0.875rem", 
        padding: "8px 12px",
        backgroundColor: "rgb(252 252 252)", // Very light background
        border: "1px solid rgb(229 229 229)", // Subtle grey border
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <div style={{
          width: "4px",
          height: "4px",
          backgroundColor: "rgb(163 163 163)",
          borderRadius: "50%",
          flexShrink: 0
        }} />
        <span style={{ fontWeight: "400" }}>
          Tool Error: {message.content}
        </span>
      </div>
    );
  }

  if (!message.parts || message.parts.length === 0) {
    return <MarkdownText content={message.content} />;
  }

  return (
    <div className="space-y-1">
      {message.parts.map((part, index) => (
        <div key={index}>
          {part.type === "text"
            ? <MarkdownText content={part.content} />
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
