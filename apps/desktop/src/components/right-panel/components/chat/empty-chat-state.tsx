import { Trans } from "@lingui/react/macro";
import { memo } from "react";

interface EmptyChatStateProps {
  isAnimating: boolean;
  onQuickAction: (prompt: string) => void;
  onFocusInput: () => void;
}

function EmptyChatStateBase({ isAnimating, onQuickAction, onFocusInput }: EmptyChatStateProps) {
  const handleContainerClick = () => {
    onFocusInput();
  };

  const handleButtonClick = (prompt: string) => (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent container click from triggering
    onQuickAction(prompt);
  };

  return (
    <div 
      className="flex flex-col items-center justify-center h-full p-4 text-center"
      onClick={handleContainerClick}
    >
      <div className="relative w-16 aspect-square flex items-center justify-center">
        <img
          src={isAnimating ? "/assets/dynamic.gif" : "/assets/static.png"}
          alt="Chat Assistant"
          className="w-full h-full"
        />
      </div>
      <h3 className="text-lg font-medium mb-4">
        <Trans>Hyprnote Assistant</Trans>
      </h3>
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
}

export const EmptyChatState = memo(EmptyChatStateBase);
