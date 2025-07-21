import { Badge } from "@hypr/ui/components/ui/badge";
import { Trans } from "@lingui/react/macro";
import { memo, useCallback } from "react";

interface EmptyChatStateProps {
  onQuickAction: (prompt: string) => void;
  onFocusInput: () => void;
}

export const EmptyChatState = memo(({ onQuickAction, onFocusInput }: EmptyChatStateProps) => {
  const handleContainerClick = useCallback(() => {
    onFocusInput();
  }, [onFocusInput]);

  const handleButtonClick = useCallback((prompt: string) => (e: React.MouseEvent) => {
    onQuickAction(prompt);
  }, [onQuickAction]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center h-full p-4 text-center"
      onClick={handleContainerClick}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-medium">
          <Trans>Chat with your meeting notes</Trans>
        </h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 border-blue-200">
          Beta
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mb-4 max-w-[280px]">
        <button
          onClick={handleButtonClick("Summarize this meeting")}
          className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          <Trans>Summarize meeting</Trans>
        </button>
        <button
          onClick={handleButtonClick("Identify key decisions made in this meeting")}
          className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          <Trans>Key decisions</Trans>
        </button>
        <button
          onClick={handleButtonClick("Extract action items from this meeting")}
          className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          <Trans>Extract action items</Trans>
        </button>
        <button
          onClick={handleButtonClick("Create an agenda for next meeting")}
          className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          <Trans>Create agenda</Trans>
        </button>
      </div>
    </div>
  );
});
