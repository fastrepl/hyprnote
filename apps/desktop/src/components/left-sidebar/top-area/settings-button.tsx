import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { getName, getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { CogIcon } from "lucide-react";
import { useState } from "react";

import Shortcut from "@/components/shortcut";
import { createUpdateToast } from "@/components/toast/ota";
import { useHypr } from "@/contexts";
import { openURL } from "@/utils/shell";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { toast } from "@hypr/ui/components/ui/toast";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const { userId } = useHypr();

  const versionQuery = useQuery({
    queryKey: ["appVersion"],
    queryFn: async () => {
      const [version, name] = await Promise.all([getVersion(), getName()]);
      return `${name} ${version}`;
    },
  });

  const handleClickSettings = () => {
    setOpen(false);
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleClickProfile = () => {
    setOpen(false);
    windowsCommands.windowShow({ type: "finder" }).then(() => {
      windowsCommands.windowNavigate(
        { type: "finder" },
        `/app/finder?view=contact&personId=${userId}`,
      );
    });
  };

  const handleClickChangelog = async () => {
    setOpen(false);
    try {
      await openURL("https://hyprnote.com/changelog");
    } catch (error) {
      console.error("Failed to open changelog:", error);
    }
  };

  const handleClickTalkToFounders = async () => {
    setOpen(false);
    try {
      await openURL("https://cal.com/team/hyprnote/welcome");
    } catch (error) {
      console.error("Failed to open talk to founders:", error);
    }
  };

  const handleCheckUpdates = async () => {
    setOpen(false);

    try {
      const update = await check();

      if (update) {
        const toastConfig = await createUpdateToast(update, "manual-update-check");
        toast(toastConfig);
      } else {
        toast({
          id: "no-updates-available",
          title: "No Updates Available",
          content: "You're running the latest version!",
          dismissible: true,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      toast({
        id: "update-check-failed",
        title: "Update Check Failed",
        content: "Unable to check for updates. Please try again later.",
        dismissible: true,
        duration: 3000,
      });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-neutral-200">
          <CogIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 p-0">
        {/* <DropdownHeader handleClick={handleClickPlans} isPro={isPro} /> */}

        <div className="p-1">
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
          <DropdownMenuItem
            onClick={handleCheckUpdates}
            className="cursor-pointer"
          >
            <Trans>Check Updates</Trans>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleClickTalkToFounders}
            className="cursor-pointer"
          >
            <Trans>Talk to Founders</Trans>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleClickChangelog}
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
          >
            <span>{versionQuery.data ?? "..."}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
