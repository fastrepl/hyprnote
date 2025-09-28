import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Trans } from "@lingui/react/macro";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { useHypr } from "@/contexts";
import { getDynamicQuickActions } from "../../utils/dynamic-quickactions";

interface EmptyChatStateProps {
  onQuickAction: (prompt: string) => void;
  onFocusInput: () => void;
  sessionId?: string | null;
}

export const EmptyChatState = memo(({ onQuickAction, onFocusInput, sessionId }: EmptyChatStateProps) => {
  const { userId } = useHypr();
  const [quickActions, setQuickActions] = useState<
    Array<{
      shownTitle: string;
      actualPrompt: string;
      eventName: string;
    }>
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<"small" | "medium" | "large">("large");

  useEffect(() => {
    getDynamicQuickActions(sessionId || null).then(setQuickActions);
  }, [sessionId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width < 300) {
          setContainerSize("small");
        } else if (width < 400) {
          setContainerSize("medium");
        } else {
          setContainerSize("large");
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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

  const sizeClasses = {
    small: {
      container: "p-3",
      iconWrapper: "mb-1",
      icon: "w-12 h-12",
      headingWrapper: "mb-1",
      heading: "text-sm",
      actionsGap: "gap-1.5",
      buttonPadding: "px-2 py-1.5",
      buttonText: "text-xs",
    },
    medium: {
      container: "p-4",
      iconWrapper: "mb-2",
      icon: "w-16 h-16",
      headingWrapper: "mb-2",
      heading: "text-base",
      actionsGap: "gap-2",
      buttonPadding: "px-3 py-2",
      buttonText: "text-xs",
    },
    large: {
      container: "p-6",
      iconWrapper: "mb-4",
      icon: "w-20 h-20",
      headingWrapper: "mb-4",
      heading: "text-xl",
      actionsGap: "gap-3",
      buttonPadding: "px-4 py-3",
      buttonText: "text-sm",
    },
  };

  const currentSize = sizeClasses[containerSize];

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 max-h-[calc(100%-120px)] flex flex-col items-center justify-center overflow-y-auto text-center ${currentSize.container}`}
      onClick={handleContainerClick}
    >
      {/* Icon at the top */}
      <div className={currentSize.iconWrapper}>
        <img
          src="/assets/dynamic.gif"
          alt=""
          className={`${currentSize.icon} mx-auto`}
        />
      </div>

      {/* Main heading */}
      <div className={`${currentSize.headingWrapper} flex items-center gap-2`}>
        <h3 className={`${currentSize.heading} font-medium`}>
          <Trans>Ask Hyprnote to...</Trans>
        </h3>
      </div>

      {/* Vertical list of actions */}
      <div className={`flex flex-col ${currentSize.actionsGap} w-full max-w-[320px]`}>
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={handleButtonClick(action.actualPrompt, action.eventName)}
            className={`w-full text-left ${currentSize.buttonPadding} rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors ${currentSize.buttonText} text-neutral-700`}
          >
            {action.shownTitle}
          </button>
        ))}
      </div>

      {/* Beta notice moved to bottom */}
      {
        /* <div className="mt-8 p-3 rounded-lg bg-neutral-50 border border-neutral-200 max-w-[280px]">
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
      </div> */
      }
    </div>
  );
});
