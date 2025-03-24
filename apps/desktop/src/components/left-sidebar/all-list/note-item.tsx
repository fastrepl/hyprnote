import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type LinkProps, useNavigate } from "@tanstack/react-router";
import { AppWindowMacIcon, CalendarDaysIcon, TrashIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/contexts";
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

interface NoteItemProps {
  activeSessionId: string;
  currentSessionId: string;
}

export function NoteItem({
  activeSessionId,
  currentSessionId,
}: NoteItemProps) {
  const navigate = useNavigate();
  const activeSession = useSession(activeSessionId, (s) => s.session);
  const currentSession = useSession(currentSessionId, (s) => s.session);

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
      to: "/app/note/$id",
      params: { id: currentSession.id },
    });
  };

  const handleOpenWindow = () => {
    windowsCommands.windowShow({ note: currentSession.id });
  };

  const handleOpenCalendar = () => {
    const props = {
      to: "/app/calendar",
      search: { sessionId: currentSession.id },
    } as const satisfies LinkProps;

    const url = props.to.concat(`?sessionId=${props.search.sessionId}`);

    windowsCommands.windowEmitNavigate("calendar", url).then(() => {
      windowsCommands.windowShow("calendar");
    });
  };
  const html2text = (html: string) => {
    return html.replace(/<[^>]*>?/g, "");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isActive || !buttonRef.current) {
      return;
    }

    const height = window.innerHeight || document.documentElement.clientHeight;
    const width = window.innerWidth || document.documentElement.clientWidth;

    const { top, left, bottom, right } = buttonRef.current.getBoundingClientRect();
    const isInView = top >= 0 && left >= 0 && bottom <= height && right <= width;

    if (!isInView) {
      buttonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive]);

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger disabled={isActive}>
        <button
          ref={buttonRef}
          onClick={handleClick}
          disabled={isActive}
          className={cn(
            "group flex items-start gap-3 py-2 w-full text-left transition-all rounded-lg px-2",
            isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
            isOpen && "bg-neutral-100",
          )}
        >
          <div className="flex flex-col items-start gap-1 max-w-[180px] truncate">
            <div className="flex items-center justify-between gap-1">
              <div className="font-medium text-sm">
                {currentSession.title || "Untitled"}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="font-medium">{format(sessionDate, "h:mm a")}</span>
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
          <Trans>Open in new window</Trans>
        </ContextMenuItem>

        <ContextMenuItem
          className="cursor-pointer"
          onClick={handleOpenCalendar}
        >
          <CalendarDaysIcon size={16} className="mr-2" />
          <Trans>Open in calendar view</Trans>
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
