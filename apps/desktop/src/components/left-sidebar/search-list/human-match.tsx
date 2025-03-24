import { Trans } from "@lingui/react/macro";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { AppWindowMacIcon } from "lucide-react";
import { useState } from "react";

import { type SearchMatch } from "@/stores/search";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/ui/lib/utils";

export function HumanMatch({ match: { item: human } }: { match: SearchMatch & { type: "human" } }) {
  const navigate = useNavigate();
  const match = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const [isOpen, setIsOpen] = useState(false);

  const isActive = match?.params.id === human.id;

  const handleClick = () => {
    navigate({
      to: "/app/human/$id",
      params: { id: human.id },
    });
  };

  const handleOpenWindow = () => {
    windowsCommands.windowShow({ human: human.id });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger disabled={isActive}>
        <button
          onClick={handleClick}
          disabled={isActive}
          className={cn([
            "w-full text-left group flex items-start py-2 rounded-lg px-2",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          ])}
        >
          <div className="flex flex-col items-start gap-1">
            <div className="font-medium text-sm line-clamp-1">
              {human.full_name || "Unnamed Person"} <span className="text-neutral-700">{human.job_title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
              {human.email}
            </div>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          className="cursor-pointer"
          onClick={handleOpenWindow}
        >
          <AppWindowMacIcon size={16} className="mr-2" />
          <Trans>Open in new window</Trans>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
