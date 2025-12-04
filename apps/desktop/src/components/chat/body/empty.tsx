import { MessageSquareIcon, SettingsIcon, SparklesIcon } from "lucide-react";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

import { useTabs } from "../../../store/zustand/tabs";

export function ChatBodyEmpty({
  isModelConfigured = true,
}: {
  isModelConfigured?: boolean;
}) {
  const openNew = useTabs((state) => state.openNew);

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

  const handleOpenChatShortcuts = useCallback(() => {
    openNew({ type: "chat_shortcuts" });
  }, [openNew]);

  const handleOpenPrompts = useCallback(() => {
    openNew({ type: "prompts" });
  }, [openNew]);

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
          <div className="flex gap-2 pt-2 border-t border-neutral-200 mt-1">
            <button
              onClick={handleOpenChatShortcuts}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <MessageSquareIcon size={12} />
              <span>Shortcuts</span>
            </button>
            <button
              onClick={handleOpenPrompts}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <SparklesIcon size={12} />
              <span>Prompts</span>
            </button>
            <button
              onClick={handleGoToSettings}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <SettingsIcon size={12} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
