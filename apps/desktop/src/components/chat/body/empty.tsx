import { MessageSquareIcon, SparklesIcon } from "lucide-react";
import { useCallback } from "react";

import { useTabs } from "../../../store/zustand/tabs";

export function ChatBodyEmpty({
  isModelConfigured = true,
}: {
  isModelConfigured?: boolean;
}) {
  const openNew = useTabs((state) => state.openNew);

  const handleGoToSettings = useCallback(() => {
    openNew({ type: "ai", state: { tab: "intelligence" } });
  }, [openNew]);

  const handleOpenChatShortcuts = useCallback(() => {
    openNew({ type: "ai", state: { tab: "shortcuts" } });
  }, [openNew]);

  const handleOpenPrompts = useCallback(() => {
    openNew({ type: "ai", state: { tab: "prompts" } });
  }, [openNew]);

  if (!isModelConfigured) {
    return (
      <div className="flex justify-start px-3 py-2 pb-4">
        <div className="flex flex-col min-w-[240px] max-w-[80%]">
          <div className="flex items-center gap-2 mb-2">
            <img src="/assets/dynamic.gif" alt="Hyprnote" className="w-5 h-5" />
            <span className="text-sm font-medium text-foreground">
              Hyprnote AI
            </span>
          </div>
          <p className="text-sm text-foreground mb-2">
            Hey! I need you to configure a language model to start chatting with
            me!
          </p>
          <button
            onClick={handleGoToSettings}
            className="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 text-xs text-foreground bg-linear-to-b from-background to-muted hover:from-muted hover:to-muted rounded-full border border-border transition-colors"
          >
            <SparklesIcon size={12} />
            Open AI Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-3 pb-4">
      <div className="flex flex-col min-w-[240px] max-w-[80%]">
        <div className="flex items-center gap-1 mb-2">
          <img src="/assets/dynamic.gif" alt="Hyprnote" className="w-5 h-5" />
          <span className="text-sm font-medium text-foreground">
            Hyprnote AI
          </span>
        </div>
        <p className="text-sm text-foreground mb-2">
          Hey! I can help you with a lot of cool stuff :)
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={handleOpenChatShortcuts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-foreground bg-linear-to-b from-background to-muted hover:from-muted hover:to-muted rounded-full border border-border transition-colors"
          >
            <MessageSquareIcon size={12} />
            Shortcuts
          </button>
          <button
            onClick={handleOpenPrompts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-foreground bg-linear-to-b from-background to-muted hover:from-muted hover:to-muted rounded-full border border-border transition-colors"
          >
            <SparklesIcon size={12} />
            Prompts
          </button>
        </div>
      </div>
    </div>
  );
}
