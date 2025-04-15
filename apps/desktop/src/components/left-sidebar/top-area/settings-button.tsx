import { Trans } from "@lingui/react/macro";
import { CogIcon, CpuIcon } from "lucide-react";

import Shortcut from "@/components/shortcut";
import { useHypr } from "@/contexts";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";

export function SettingsButton() {
  const { userId } = useHypr();

  const handleClickSettings = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleClickProfile = () => {
    windowsCommands.windowShow({ type: "human", value: userId });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-neutral-200">
          <CogIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="flex items-center gap-2 bg-neutral-600 rounded text-white">
          <CpuIcon className="size-4" /> <Trans>Local mode</Trans>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleClickSettings}
          className="cursor-pointer"
        >
          <Trans>Settings</Trans>
          <Shortcut macDisplay="⌘," windowsDisplay="Ctrl+," />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleClickProfile}
          className="cursor-pointer"
        >
          <Trans>My Profile</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
