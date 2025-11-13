import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function ChatBodyEmpty({
  isModelConfigured = true,
}: {
  isModelConfigured?: boolean;
}) {
  const handleGoToSettings = useCallback(() => {
    windowsCommands
      .windowShow({ type: "settings" })
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() =>
        windowsCommands.windowEmitNavigate(
          { type: "settings" },
          {
            path: "/app/settings",
            search: { tab: "intelligence" },
          },
        ),
      );
  }, []);

  const quickActions = [
    "Make a 1-paragraph summary",
    "Draft a follow-up mail for others",
    "What are the next steps for me",
  ];

  const handleQuickAction = (action: string) => {
    // For now, we just log it
    console.log("Quick action clicked:", action);
  };

  if (!isModelConfigured) {
    return (
      <div className="flex justify-start px-3 py-2">
        <div className="flex flex-col max-w-[80%]">
          <div className="rounded-2xl px-3 py-1 text-sm bg-neutral-100 text-neutral-800">
            <div className="flex items-center gap-2 mb-1 py-1">
              <img
                src="/assets/dynamic.gif"
                alt="Hyprnote"
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-neutral-800">
                Hyprnote AI
              </span>
            </div>
            <p className="text-sm text-neutral-700 mb-2">
              Hey! I need you to configure a language model to start chatting
              with me!
            </p>
            <Button
              onClick={handleGoToSettings}
              variant="default"
              size="sm"
              className="mb-1"
            >
              Go to settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-3 py-2">
      <div className="flex flex-col max-w-[80%]">
        <div className="rounded-2xl px-3 py-1 text-sm bg-neutral-100 text-neutral-800">
          <div className="flex items-center gap-2 mb-1 py-1">
            <img src="/assets/dynamic.gif" alt="Hyprnote" className="w-5 h-5" />
            <span className="text-sm font-medium text-neutral-800">
              Hyprnote AI
            </span>
          </div>
          <p className="text-sm text-neutral-700 mb-2">
            Hey! I can help you with a lot of cool stuff :)
          </p>
          <div className="flex flex-col gap-1 pb-1">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-2 text-sm bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors border border-neutral-200 text-left"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
