import { Trans } from "@lingui/react/macro";
import { MessageCircleMore } from "lucide-react";
import { memo, useEffect } from "react";

import { useRightPanel } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import Shortcut from "../../shortcut";

function ChatPanelButtonBase() {
  const { isExpanded, currentView, togglePanel } = useRightPanel();

  const isActive = isExpanded && currentView === "chat";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        togglePanel("chat");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePanel]);

  const handleClick = () => {
    togglePanel("chat");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn("hover:bg-neutral-200 text-xs size-7 p-0", isActive && "bg-neutral-200")}
        >
          <MessageCircleMore className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <Trans>Toggle chat panel</Trans> <Shortcut macDisplay="⌘J" windowsDisplay="Ctrl+J" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export const ChatPanelButton = memo(ChatPanelButtonBase);
