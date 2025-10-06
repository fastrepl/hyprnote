import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { EmptyChatStateUI } from "@hypr/ui/components/chat/empty-chat-state";
import { useCallback, useEffect, useState } from "react";

import { useHypr } from "@/contexts";
import { getDynamicQuickActions } from "../../utils/dynamic-quickactions";

interface EmptyChatStateProps {
  onQuickAction: (prompt: string) => void;
  onFocusInput: () => void;
  sessionId?: string | null;
}

export function EmptyChatState({ onQuickAction, onFocusInput, sessionId }: EmptyChatStateProps) {
  const { userId } = useHypr();
  const [quickActions, setQuickActions] = useState<
    Array<{
      shownTitle: string;
      actualPrompt: string;
      eventName: string;
    }>
  >([]);

  useEffect(() => {
    getDynamicQuickActions(sessionId ?? null, userId ?? undefined).then(setQuickActions);
  }, [sessionId, userId]);

  const handleButtonClick = useCallback((prompt: string, analyticsEvent: string) => (e: React.MouseEvent) => {
    if (userId) {
      analyticsCommands.event({
        event: analyticsEvent,
        distinct_id: userId,
      });
    }

    onQuickAction(prompt);
  }, [onQuickAction, userId]);

  const handleContainerClick = useCallback(() => {
    onFocusInput();
  }, [onFocusInput]);

  return (
    <EmptyChatStateUI
      onQuickAction={onQuickAction}
      onFocusInput={onFocusInput}
      sessionId={sessionId}
      userId={userId}
      handleButtonClick={handleButtonClick}
      handleContainerClick={handleContainerClick}
      quickActions={quickActions}
    />
  );
}
