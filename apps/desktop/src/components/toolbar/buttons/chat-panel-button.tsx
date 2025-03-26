import { Trans } from "@lingui/react/macro";
import { useEffect, useState } from "react";

import { useRightPanel } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import Shortcut from "../../shortcut";

export function ChatPanelButton() {
  const { isExpanded, togglePanel } = useRightPanel();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1625);
      return () => clearTimeout(timeout);
    }, 4625);

    return () => clearInterval(animationInterval);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePanel}
          className={cn("hover:bg-neutral-200 text-xs size-7 p-0", isExpanded && "bg-neutral-200")}
        >
          <div className="relative w-6 aspect-square flex items-center justify-center">
            <img
              src={isAnimating ? "/assets/dynamic.gif" : "/assets/static.png"}
              alt="Chat Assistant"
              className="w-full h-full"
            />
          </div>
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
