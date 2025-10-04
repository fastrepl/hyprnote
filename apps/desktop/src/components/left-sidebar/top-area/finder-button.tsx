import { FolderSearch } from "lucide-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

export function FinderButton() {
  const handleClickFinder = () => {
    windowsCommands.windowShow({ type: "finder" });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClickFinder}
          className="hover:bg-neutral-200"
        >
          <FolderSearch size={18} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Open finder view
      </TooltipContent>
    </Tooltip>
  );
}
