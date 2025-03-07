import { ChevronsLeftIcon, MenuIcon } from "lucide-react";
import { useLeftSidebar } from "@/contexts/left-sidebar";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import Shortcut from "../../shortcut";

export function LeftSidebarButton({ type }: { type: "toolbar" | "sidebar" }) {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: async () => {
      return getOsType();
    },
  });

  const { isExpanded, togglePanel } = useLeftSidebar();

  const Icon = isExpanded ? ChevronsLeftIcon : MenuIcon;

  if (type === "toolbar" && isExpanded) {
    return null;
  }

  return (
    <div className={osType.data === "macos" ? "pl-[70px]" : ""}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className="hover:bg-neutral-200"
          >
            <Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Toggle left sidebar{" "}
            <Shortcut macDisplay="⌘L" windowsDisplay="Ctrl+L" />
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
