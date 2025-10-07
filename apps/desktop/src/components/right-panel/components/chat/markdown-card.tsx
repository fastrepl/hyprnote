import { commands as miscCommands } from "@hypr/plugin-misc";
import { MarkdownCard as MarkdownCardUI } from "@hypr/ui/components/chat/markdown-card";
import { useCallback } from "react";

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

  const convertMarkdownToHtml = useCallback(async (markdown: string) => {
    return await miscCommands.opinionatedMdToHtml(markdown);
  }, []);

  return <MarkdownCardUI 
  content={content} 
  isComplete={isComplete} 
  sessionTitle={sessionTitle} 
  onApplyMarkdown={onApplyMarkdown} 
  hasEnhancedNote={hasEnhancedNote} 
  convertMarkdownToHtml={convertMarkdownToHtml} 
  />;
}
