import { Trans } from "@lingui/react/macro";
import { SettingsIcon } from "lucide-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import Shortcut from "@/components/shortcut";

export function SettingsButton() {
  const handleClickSettings = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClickSettings}
          className="hover:bg-neutral-200"
        >
          <SettingsIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <Trans>Open settings</Trans>{" "}
        <Shortcut macDisplay="⌘," windowsDisplay="Ctrl+," />
      </TooltipContent>
    </Tooltip>
  );
}
