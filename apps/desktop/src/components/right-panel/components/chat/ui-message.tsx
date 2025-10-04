import { commands as miscCommands } from "@hypr/plugin-misc";
import { UIMessageComponent as UIMessageUI } from "@hypr/ui/components/chat/ui-message";
import type { UIMessage } from "@hypr/utils/ai";
import { type FC, useCallback } from "react";
import { parseMarkdownBlocks } from "../../utils/markdown-parser";
import { MarkdownCard } from "./markdown-card";

interface UIMessageComponentProps {
  message: UIMessage;
  sessionTitle?: string;
  hasEnhancedNote?: boolean;
  onApplyMarkdown?: (content: string) => void;
}

export const UIMessageComponent: FC<UIMessageComponentProps> = (props) => {
  // Provide the markdown converter function
  const convertMarkdownToHtml = useCallback(async (markdown: string) => {
    return await miscCommands.opinionatedMdToHtml(markdown);
  }, []);

  // Pass all dependencies to the UI component
  return (
    <UIMessageUI
      {...props}
      convertMarkdownToHtml={convertMarkdownToHtml}
      parseMarkdownBlocks={parseMarkdownBlocks}
      MarkdownCard={MarkdownCard}
    />
  );
};
