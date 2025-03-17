import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AppWindowMacIcon, ArrowUpRight, EarIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

import { useSession, useSessions } from "@/contexts";
import { useStore2 } from "@/utils";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/ui/lib/utils";
import { format } from "@hypr/utils/datetime";
import { Trans } from "@lingui/react/macro";
import SoundIndicator from "../sound-indicator";

export function NoteItem({
  sessionId,
  isLive,
}: {
  sessionId: string;
  isLive?: boolean;
}) {
  const navigate = useNavigate();

  const activeSession = useSession((s) => s.session);
  const currentSession = useStore2(useSessions((s) => s.sessions[sessionId]), (s) => s.session);
  const currentSessionEvent = useQuery({
    queryKey: ["event", currentSession.id],
    queryFn: () => dbCommands.sessionGetEvent(currentSession.id),
  });

  const [isOpen, setIsOpen] = useState(false);
  const isActive = activeSession.id === currentSession.id;
  const sessionDate = currentSessionEvent.data?.start_date ?? currentSession.created_at;

  const queryClient = useQueryClient();

  const deleteSession = useMutation({
    mutationFn: () => dbCommands.deleteSession(currentSession.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const handleClick = () => {
    navigate({
      to: "/app/note/$id/main",
      params: { id: currentSession.id },
    });
  };

  const handleOpenWindow = () => {
    windowsCommands.windowShow({ note: currentSession.id });
  };

  const html2text = (html: string) => {
    return html.replace(/<[^>]*>?/g, "");
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
          className={cn(
            "group flex items-start gap-3 py-2 w-full text-left transition-all rounded px-2",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          )}
        >
          <div className="flex flex-col items-start gap-1 max-w-[180px] truncate">
            <div className="flex items-center justify-between gap-1">
              <div className="font-medium text-sm">
                {currentSession.title || "Untitled"}
              </div>
              {isLive && <SoundIndicator />}
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="font-medium">{format(sessionDate, "M/d/yy")}</span>
              <span className="text-xs">
                {html2text(currentSession.enhanced_memo_html || currentSession.raw_memo_html)}
              </span>
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
          <Trans>New window</Trans>
          <ArrowUpRight size={16} className="ml-2" />
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="text-red-500 hover:bg-red-100 hover:text-red-600 cursor-pointer"
          onClick={() => deleteSession.mutate()}
        >
          <TrashIcon size={16} className="mr-2" />
          <Trans>Delete</Trans>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
