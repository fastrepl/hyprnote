import { clsx } from "clsx";
import { differenceInDays, format, isPast } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import * as persisted from "../../../store/tinybase/persisted";
import { Tab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { InteractiveButton } from "../../interactive-button";

type TimelineItem = {
  id: string;
  type: "future-event" | "session";
  title: string;
  timestamp: string;
  date: string;
  eventId?: string;
};

export function TimelineView() {
  const eventsWithoutSessionTable = persisted.UI.useResultTable(
    persisted.QUERIES.eventsWithoutSession,
    persisted.STORE_ID,
  );
  const sessionsWithMaybeEventTable = persisted.UI.useResultTable(
    persisted.QUERIES.sessionsWithMaybeEvent,
    persisted.STORE_ID,
  );

  const allItems = useMemo(() => {
    const items: TimelineItem[] = [];

    if (eventsWithoutSessionTable) {
      Object.entries(eventsWithoutSessionTable).forEach(([eventId, row]) => {
        const eventStartTime = new Date(String(row.started_at || ""));

        if (!isPast(eventStartTime)) {
          items.push({
            id: eventId,
            type: "future-event",
            title: String(row.title || ""),
            timestamp: String(row.started_at || ""),
            date: format(eventStartTime, "yyyy-MM-dd"),
            eventId,
          });
        }
      });
    }

    if (sessionsWithMaybeEventTable) {
      Object.entries(sessionsWithMaybeEventTable).forEach(([sessionId, row]) => {
        const timestamp = row.event_started_at
          ? String(row.event_started_at)
          : String(row.created_at || "");

        items.push({
          id: sessionId,
          type: "session",
          title: String(row.title || ""),
          timestamp,
          date: format(new Date(timestamp), "yyyy-MM-dd"),
          eventId: row.event_id ? String(row.event_id) : undefined,
        });
      });
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [eventsWithoutSessionTable, sessionsWithMaybeEventTable]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    allItems.forEach((item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    return groups;
  }, [allItems]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));
  }, [groupedItems]);

  const [visibleCount, setVisibleCount] = useState(20);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, allItems.length));
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [allItems.length]);

  const visibleItems = useMemo(() => {
    return allItems.slice(0, visibleCount);
  }, [allItems, visibleCount]);

  const visibleDates = useMemo(() => {
    const dates = new Set(visibleItems.map((item) => item.date));
    return sortedDates.filter((date) => dates.has(date));
  }, [visibleItems, sortedDates]);

  return (
    <div ref={scrollRef} className="flex flex-col flex-1 overflow-y-auto">
      {visibleDates.map((date) => (
        <div key={date}>
          <DateHeader date={date} />
          {groupedItems[date]
            .filter((item) => visibleItems.includes(item))
            .map((item) => (
              <TimelineItem
                key={`${item.type}-${item.id}`}
                item={item}
              />
            ))}
        </div>
      ))}
      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}

function DateHeader({ date }: { date: string }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const daysDiff = differenceInDays(new Date(today), new Date(date));

  let label: string;
  if (daysDiff === 0) {
    label = "Today";
  } else if (daysDiff === 1) {
    label = "Yesterday";
  } else if (daysDiff === -1) {
    label = "Tomorrow";
  } else if (daysDiff > 1 && daysDiff <= 7) {
    label = `${daysDiff} days ago`;
  } else if (daysDiff < -1 && daysDiff >= -7) {
    label = `in ${Math.abs(daysDiff)} days`;
  } else {
    label = format(new Date(date), "MMM d, yyyy");
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-2 py-2">
      <div className="text-base font-bold text-gray-900">{label}</div>
    </div>
  );
}

function TimelineItem({ item }: { item: TimelineItem }) {
  const { currentTab, openCurrent, openNew } = useTabs();
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const handleClick = () => {
    if (item.type === "future-event") {
      // Future event: Create session if doesn't exist, link to event, open it
      handleFutureEventClick(false);
    } else {
      // Session: Just open the session tab
      const tab: Tab = { id: item.id, type: "sessions", active: false };
      openCurrent(tab);
    }
  };

  const handleCmdClick = () => {
    if (item.type === "future-event") {
      handleFutureEventClick(true);
    } else {
      const tab: Tab = { id: item.id, type: "sessions", active: false };
      openNew(tab);
    }
  };

  const handleFutureEventClick = (openInNewTab: boolean) => {
    if (!item.eventId || !store) {
      return;
    }

    const sessions = store.getTable("sessions");
    let existingSessionId: string | null = null;

    Object.entries(sessions).forEach(([sessionId, session]) => {
      if (session.event_id === item.eventId) {
        existingSessionId = sessionId;
      }
    });

    if (existingSessionId) {
      const tab: Tab = { id: existingSessionId, type: "sessions", active: false };
      if (openInNewTab) {
        openNew(tab);
      } else {
        openCurrent(tab);
      }
    } else {
      const sessionId = id();
      store.setRow("sessions", sessionId, {
        event_id: item.eventId,
        title: item.title,
        created_at: new Date().toISOString(),
      });
      const tab: Tab = { id: sessionId, type: "sessions", active: false };
      if (openInNewTab) {
        openNew(tab);
      } else {
        openCurrent(tab);
      }
    }
  };

  const active = currentTab?.type === "sessions" && currentTab?.id === item.id;

  const contextMenu = (
    <>
      <ContextMenuItem onClick={() => console.log("Delete:", item.type, item.id)}>
        Delete
      </ContextMenuItem>
    </>
  );

  const displayTime = item.timestamp ? format(new Date(item.timestamp), "HH:mm") : "";

  return (
    <InteractiveButton
      onClick={handleClick}
      onCmdClick={handleCmdClick}
      contextMenu={contextMenu}
      className={clsx([
        "w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100",
        active && "bg-blue-50",
      ])}
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-normal truncate">{item.title}</div>
        {displayTime && <div className="text-xs text-gray-500">{displayTime}</div>}
      </div>
    </InteractiveButton>
  );
}
