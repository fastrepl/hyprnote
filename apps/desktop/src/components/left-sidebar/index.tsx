import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { addDays } from "date-fns";
import { CalendarDaysIcon, SettingsIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { useHypr, useHyprSearch, useLeftSidebar, useOngoingSession } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../shortcut";
import { LeftSidebarButton } from "../toolbar/buttons/left-sidebar-button";
import EventsList from "./events-list";
import NotesList from "./notes-list";
import OngoingSession from "./ongoing-session";
import SearchList from "./search-list";

export default function LeftSidebar() {
  const { userId } = useHypr();
  const { isExpanded } = useLeftSidebar();

  const { status, ongoingSessionId } = useOngoingSession((s) => ({
    status: s.status,
    ongoingSessionId: s.sessionId,
  }));

  const { isSearching, matches } = useHyprSearch((s) => ({
    isSearching: !!s.query,
    matches: s.matches,
  }));

  const windowLabel = getCurrentWebviewWindowLabel();
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  const isInOngoingNoteMain = noteMatch?.params.id === ongoingSessionId;
  const isInOngoingNoteSub = noteMatch?.params.id === ongoingSessionId;
  const isInOngoingNote = isInOngoingNoteMain || isInOngoingNoteSub;
  const inMeetingAndNotInNote = (status === "active") && ongoingSessionId !== null && !isInOngoingNote;

  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const events = await dbCommands.listEvents({
        type: "dateRange",
        user_id: userId,
        limit: 3,
        start: new Date().toISOString(),
        end: addDays(new Date(), 30).toISOString(),
      });

      const sessions = await Promise.all(events.map((event) => dbCommands.getSession({ calendarEventId: event.id })));
      const eventsWithSessions = events.map((event, index) => ({ ...event, session: sessions[index] }));
      return eventsWithSessions.filter((event) =>
        !(event.session?.id && ongoingSessionId && event.session.id === ongoingSessionId)
      );
    },
  });

  if (windowLabel !== "main") {
    return null;
  }

  return (
    <motion.nav
      layout
      initial={{ width: isExpanded ? 240 : 0, opacity: isExpanded ? 1 : 0 }}
      animate={{ width: isExpanded ? 240 : 0, opacity: isExpanded ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col overflow-hidden border-r bg-neutral-50"
    >
      <TopArea />

      {inMeetingAndNotInNote && <OngoingSession sessionId={ongoingSessionId} />}

      {isSearching
        ? (
          <div className="flex-1 h-full overflow-y-auto">
            <SearchList matches={matches} />
          </div>
        )
        : (
          <LayoutGroup>
            <AnimatePresence initial={false}>
              <div className="flex-1 h-full overflow-y-auto">
                <div className="h-full space-y-4 px-3 pb-4">
                  <EventsList events={events.data ?? []} />
                  <NotesList ongoingSessionId={ongoingSessionId} />
                </div>
              </div>
            </AnimatePresence>
          </LayoutGroup>
        )}
    </motion.nav>
  );
}

function TopArea() {
  const handleClickSettings = () => {
    windowsCommands.windowShow("settings");
  };

  const handleClickCalendar = () => {
    windowsCommands.windowShow("calendar");
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-end min-h-11 px-2"
    >
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
          <Trans>
            Open settings
          </Trans>{" "}
          <Shortcut macDisplay="⌘," windowsDisplay="Ctrl+," />
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClickCalendar}
            className="hover:bg-neutral-200"
          >
            <CalendarDaysIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <Trans>Open calendar view</Trans>
        </TooltipContent>
      </Tooltip>

      <LeftSidebarButton type="sidebar" />
    </div>
  );
}
