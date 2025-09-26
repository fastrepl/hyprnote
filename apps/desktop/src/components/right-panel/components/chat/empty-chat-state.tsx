import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Trans } from "@lingui/react/macro";
import { memo, useCallback } from "react";

import { useHypr } from "@/contexts";

interface EmptyChatStateProps {
  onQuickAction: (prompt: string) => void;
  onFocusInput: () => void;
}

export const EmptyChatState = memo(({ onQuickAction, onFocusInput }: EmptyChatStateProps) => {
  const { userId } = useHypr();

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
  }, [onQuickAction]);

  const handleCustomEndpointsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    windowsCommands.windowShow({ type: "settings" }).then(() => {
      windowsCommands.windowNavigate({ type: "settings" }, "/app/settings?tab=ai-llm");
    });
  }, []);

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
        <button
          onClick={handleButtonClick("Make this meeting note more concise", "chat_shorten_summary")}
          className="w-full text-left px-4 py-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
        >
          <Trans>Create a concise one-paragraph summary</Trans>
        </button>
        <button
          onClick={handleButtonClick("Extract action items from this meeting", "chat_extract_action_items")}
          className="w-full text-left px-4 py-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
        >
          <Trans>List all the action items that were decided</Trans>
        </button>
        <button
          onClick={handleButtonClick("Draft a follow up email to the participants", "chat_draft_follow_up")}
          className="w-full text-left px-4 py-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
        >
          <Trans>Create an email draft and attach summary</Trans>
        </button>
        <button
          onClick={handleButtonClick(
            "Tell me the most important questions asked in this meeting and the answers",
            "chat_important_qas",
          )}
          className="w-full text-left px-4 py-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
        >
          <Trans>Important Q&As</Trans>
        </button>
        {/*
        <button
          onClick={handleButtonClick(
            "Add more direct quotes from the transcript to the summary",
            "chat_add_more_quotes",
          )}
          className="w-full text-left px-4 py-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm text-neutral-700"
        >
          <Trans>Add more quotes</Trans>
        </button>
        */}
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
