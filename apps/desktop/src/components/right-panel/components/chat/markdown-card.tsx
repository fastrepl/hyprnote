import { commands as miscCommands } from "@hypr/plugin-misc";
import Renderer from "@hypr/tiptap/renderer";
import { Button } from "@hypr/ui/components/ui/button";
import { FileTextIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface MarkdownCardProps {
  content: string;
  isComplete: boolean;
  sessionTitle?: string;
  onApplyMarkdown?: (markdownContent: string) => void;
  hasEnhancedNote?: boolean;
}

export function MarkdownCard(
  { content, isComplete, sessionTitle, onApplyMarkdown, hasEnhancedNote = false }: MarkdownCardProps,
) {
  const [htmlContent, setHtmlContent] = useState<string>("");

  const handleApplyClick = () => {
    if (onApplyMarkdown) {
      onApplyMarkdown(content);
    }
  };

  useEffect(() => {
    const convertMarkdown = async () => {
      try {
        let html = await miscCommands.opinionatedMdToHtml(content);

        // Clean up spacing
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
        /* Override tiptap spacing for compact cards */
        .markdown-card-container .tiptap-normal {
          font-size: 0.875rem !important;
          line-height: 2 !important;
          padding: 0 !important;
          /* Enable text selection */
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        .markdown-card-container .tiptap-normal * {
          /* Ensure all children are selectable */
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        .markdown-card-container .tiptap-normal h1 {
          margin: 8px 0 8px 0 !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
        }
        
        .markdown-card-container .tiptap-normal h1:first-child {
          margin-top: 0 !important;
        }
        
        .markdown-card-container .tiptap-normal p {
          margin: 0 0 20px 0 !important;
        }
        
        .markdown-card-container .tiptap-normal ul {
          margin: 0 0 8px 0 !important;
          padding-left: 1.2rem !important;
        }
        
        .markdown-card-container .tiptap-normal li {
          margin-bottom: 3px !important;
        }
        
        /* Make selection highlight visible */
        .markdown-card-container .tiptap-normal ::selection {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        
        .markdown-card-container .tiptap-normal ::-moz-selection {
          background-color: #3b82f6 !important;
          color: white !important;
        }
      `}
      </style>

      {/* Flat card with no shadow */}
      <div className="mt-4 mb-4 border border-neutral-200 rounded-lg bg-white overflow-hidden">
        {/* Grey header section - Made thinner with py-1 */}
        <div className="bg-neutral-50 px-4 py-1 border-b border-neutral-200 flex items-center justify-between">
          <div className="text-sm text-neutral-600 flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            {sessionTitle || "Hyprnote Suggestion"}
          </div>

          <Button
            variant="ghost"
            className="hover:bg-neutral-200 h-6 px-2 text-xs text-neutral-600 flex items-center gap-1"
            onClick={handleApplyClick}
          >
            <PlayIcon className="size-3" />
            Apply
          </Button>
        </div>

        {/* Content section - Add selectable class */}
        <div className="p-4">
          <div className="markdown-card-container select-text">
            <Renderer initialContent={htmlContent} />
          </div>
        </div>
      </div>
    </>
  );
}
