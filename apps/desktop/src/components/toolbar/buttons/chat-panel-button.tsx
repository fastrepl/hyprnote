import { MessageCircleMore } from "lucide-react";
import { memo, useEffect } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { useRightPanel } from "@hypr/utils/contexts";
import Shortcut from "../../shortcut";

function ChatPanelButtonBase() {
  const { isExpanded, togglePanel } = useRightPanel();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        togglePanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePanel]);

  const handleClick = () => {
    togglePanel();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn("hover:bg-neutral-200 text-xs size-7 p-0", isExpanded && "bg-neutral-200")}
        >
          <MessageCircleMore className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Toggle chat panel <Shortcut macDisplay="⌘J" windowsDisplay="Ctrl+J" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export const ChatPanelButton = memo(ChatPanelButtonBase);
