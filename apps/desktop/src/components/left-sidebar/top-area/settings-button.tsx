import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import { getName, getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { CastleIcon, CogIcon, ShieldIcon } from "lucide-react";
import { useState } from "react";

import Shortcut from "@/components/shortcut";
import { createUpdateToast } from "@/components/toast/ota";
import { useHypr } from "@/contexts";
import { useLicense } from "@/hooks/use-license";
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
import { cn } from "@hypr/ui/lib/utils";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const { userId } = useHypr();

  const { getLicense } = useLicense();
  const isPro = !!getLicense.data?.valid;

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

  const handleClickPlans = () => {
    setOpen(false);

    windowsCommands.windowShow({ type: "settings" }).then(() => {
      const params = { to: "/app/settings", search: { tab: "billing" } } as const satisfies LinkProps;

      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: params.to,
          search: params.search,
        });
      }, 500);
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
      await openURL("https://cal.com/team/hyprnote/intro");
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
        <DropdownHeader handleClick={handleClickPlans} isPro={isPro} />

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

function DropdownHeader({
  isPro,
  handleClick,
}: {
  isPro: boolean;
  handleClick: () => void;
}) {
  return (
    <div
      onClick={handleClick}
      className={cn([
        "px-3 py-2 bg-gradient-to-r rounded-t-md relative overflow-hidden cursor-pointer",
        isPro
          ? "from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700"
          : "from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800",
      ])}
    >
      <div className="absolute inset-0 opacity-70">
      </div>
      <div className="flex items-center gap-3 text-white relative z-10">
        {isPro ? <CastleIcon className="size-8 animate-pulse" /> : <ShieldIcon className="size-8 animate-pulse" />}
        <div>
          <div className="font-medium">
            {isPro ? "Pro Plan" : "Free Plan"}
          </div>
          <div className="text-xs text-white/80 mt-0.5">
            {isPro ? "Full features" : "Basic features"}
          </div>
        </div>
      </div>
    </div>
  );
}
