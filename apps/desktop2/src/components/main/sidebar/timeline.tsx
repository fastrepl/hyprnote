import { clsx } from "clsx";
import { differenceInDays, format, formatDistanceToNowStrict, isPast } from "date-fns";
import { useMemo } from "react";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import * as persisted from "../../../store/tinybase/persisted";
import { Tab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { InteractiveButton } from "../../interactive-button";

type TimelineItem =
  | { type: "event"; id: string; date: string; data: persisted.Event }
  | { type: "session"; id: string; date: string; data: persisted.Session };

export function TimelineView() {
  const { groupedItems, sortedDates } = useTimelineData();

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 rounded-lg">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="sticky top-0 z-30 bg-gray-50 px-2 py-1">
            <DateHeader date={date} />
          </div>
          {groupedItems[date].map((item) => (
            <TimelineItemComponent
              key={`${item.type}-${item.id}`}
              item={item}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DateHeader({ date }: { date: string }) {
  const d = new Date(date);
  const daysDiff = differenceInDays(new Date(), d);

  let label: string;
  if (daysDiff < 30) {
    label = formatDistanceToNowStrict(d, { addSuffix: true, unit: "day" });
  } else {
    label = formatDistanceToNowStrict(d, { addSuffix: true, unit: "month" });
  }

  return <div className="text-base font-bold text-gray-900">{label}</div>;
}

function TimelineItemComponent({ item }: { item: TimelineItem }) {
  const { currentTab, openCurrent, openNew } = useTabs();
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const title = item.data.title || "";
  const timestamp = item.type === "event" ? item.data.started_at : item.data.created_at;
  const eventId = item.type === "event" ? item.id : (item.data.event_id || undefined);

  const handleClick = () => {
    if (item.type === "event") {
      handleEventClick(false);
    } else {
      const tab: Tab = { id: item.id, type: "sessions", active: false, state: { editor: "raw" } };
      openCurrent(tab);
    }
  };

  const handleCmdClick = () => {
    if (item.type === "event") {
      handleEventClick(true);
    } else {
      const tab: Tab = { id: item.id, type: "sessions", active: false, state: { editor: "raw" } };
      openNew(tab);
    }
  };

  const handleEventClick = (openInNewTab: boolean) => {
    if (!eventId || !store) {
      return;
    }

    const sessions = store.getTable("sessions");
    let existingSessionId: string | null = null;

    Object.entries(sessions).forEach(([sessionId, session]) => {
      if (session.event_id === eventId) {
        existingSessionId = sessionId;
      }
    });

    if (existingSessionId) {
      const tab: Tab = { id: existingSessionId, type: "sessions", active: false, state: { editor: "raw" } };
      if (openInNewTab) {
        openNew(tab);
      } else {
        openCurrent(tab);
      }
    } else {
      const sessionId = id();
      store.setRow("sessions", sessionId, {
        event_id: eventId,
        title: title,
        created_at: new Date().toISOString(),
      });
      const tab: Tab = { id: sessionId, type: "sessions", active: false, state: { editor: "raw" } };
      if (openInNewTab) {
        openNew(tab);
      } else {
        openCurrent(tab);
      }
    }
  };

  // TODO: not ideal
  const active = currentTab?.type === "sessions" && (
    (item.type === "session" && currentTab.id === item.id)
    || (item.type === "event" && item.id === eventId && (() => {
      if (!store) {
        return false;
      }
      const session = store.getRow("sessions", currentTab.id);
      return session?.event_id === eventId;
    })())
  );

  const contextMenu = (
    <>
      <ContextMenuItem onClick={() => console.log("Delete:", item.type, item.id)}>
        Delete
      </ContextMenuItem>
    </>
  );

  const displayTime = timestamp ? format(new Date(timestamp), "HH:mm") : "";

  return (
    <InteractiveButton
      onClick={handleClick}
      onCmdClick={handleCmdClick}
      contextMenu={contextMenu}
      className={clsx([
        "w-full text-left px-3 py-2 rounded-lg",
        active && "bg-gray-200",
        !active && "hover:bg-gray-100",
      ])}
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-normal truncate">{title}</div>
        {displayTime && <div className="text-xs text-gray-500">{displayTime}</div>}
      </div>
    </InteractiveButton>
  );
}

function useTimelineData() {
  const eventsWithoutSessionTable = persisted.UI.useResultTable(
    persisted.QUERIES.eventsWithoutSession,
    persisted.STORE_ID,
  );
  const sessionsWithMaybeEventTable = persisted.UI.useResultTable(
    persisted.QUERIES.sessionsWithMaybeEvent,
    persisted.STORE_ID,
  );

  return useMemo(() => {
    const items: TimelineItem[] = [];
    const seenEvents = new Set<string>();

    eventsWithoutSessionTable && Object.entries(eventsWithoutSessionTable).forEach(([eventId, row]) => {
      const eventStartTime = new Date(String(row.started_at || ""));
      if (!isPast(eventStartTime)) {
        items.push({
          type: "event",
          id: eventId,
          date: format(eventStartTime, "yyyy-MM-dd"),
          data: row as unknown as persisted.Event,
        });
        seenEvents.add(eventId);
      }
    });

    sessionsWithMaybeEventTable && Object.entries(sessionsWithMaybeEventTable).forEach(([sessionId, row]) => {
      const eventId = row.event_id ? String(row.event_id) : undefined;
      if (eventId && seenEvents.has(eventId)) {
        return;
      }

      const timestamp = String(row.event_started_at || row.created_at || "");
      items.push({
        type: "session",
        id: sessionId,
        date: format(new Date(timestamp), "yyyy-MM-dd"),
        data: row as unknown as persisted.Session,
      });
    });

    items.sort((a, b) => {
      const timeA = a.type === "event" ? a.data.started_at : a.data.created_at;
      const timeB = b.type === "event" ? b.data.started_at : b.data.created_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    const groupedItems = items.reduce<Record<string, TimelineItem[]>>((groups, item) => {
      (groups[item.date] ||= []).push(item);
      return groups;
    }, {});

    const sortedDates = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));
    return { groupedItems, sortedDates };
  }, [eventsWithoutSessionTable, sessionsWithMaybeEventTable]);
}
