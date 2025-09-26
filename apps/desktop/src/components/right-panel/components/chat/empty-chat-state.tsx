import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Trans } from "@lingui/react/macro";
import { memo, useCallback, useEffect, useState } from "react";

import { useHypr } from "@/contexts";
import { getDynamicQuickActions } from "../../utils/dynamic-quickactions";

interface EmptyChatStateProps {
  onQuickAction: (prompt: string) => void;
  onFocusInput: () => void;
  sessionId?: string | null;
}

export const EmptyChatState = memo(({ onQuickAction, onFocusInput, sessionId }: EmptyChatStateProps) => {
  const { userId } = useHypr();
  const [quickActions, setQuickActions] = useState<Array<{
    shownTitle: string;
    actualPrompt: string;
    eventName: string;
  }>>([]);

  useEffect(() => {
    getDynamicQuickActions(sessionId || null).then(setQuickActions);
  }, [sessionId]);

  const handleContainerClick = useCallback(() => {
    onFocusInput();
  }, [onFocusInput]);

  const handleButtonClick = useCallback((prompt: string, analyticsEvent: string) => (e: React.MouseEvent) => {
    if (userId) {
      analyticsCommands.event({
        event: analyticsEvent,
        distinct_id: userId,
      });
    }

    onQuickAction(prompt);
  }, [onQuickAction, userId]);

  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center h-full p-6 text-center"
      onClick={handleContainerClick}
    >
      {/* Icon at the top */}
      <div className="mb-4">
        <img 
          src="/assets/dynamic.gif" 
          alt="" 
          className="w-[8vw] h-[8vw] mx-auto min-w-[80px] min-h-[80px] max-w-[120px] max-h-[120px]"
        />
      </div>

      {/* Main heading */}
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xl font-medium">
          <Trans>Ask Hyprnote to...</Trans>
        </h3>
      </div>

      {/* Vertical list of actions */}
      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={handleButtonClick(action.actualPrompt, action.eventName)}
            className="w-full text-left px-4 py-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
          >
            {action.shownTitle}
          </button>
        ))}
      </div>

      {/* Beta notice moved to bottom */}
      {/* <div className="mt-8 p-3 rounded-lg bg-neutral-50 border border-neutral-200 max-w-[280px]">
        <p className="text-xs text-neutral-600 text-left">
          <Trans>
            Chat feature is in beta. For best results, we recommend you to use{" "}
            <span
              onClick={handleCustomEndpointsClick}
              className="text-blue-600 hover:text-blue-800 cursor-pointer underline"
            >
              custom endpoints
            </span>
            .
          </Trans>
        </p>
      </div> */}
    </div>
  );
});
