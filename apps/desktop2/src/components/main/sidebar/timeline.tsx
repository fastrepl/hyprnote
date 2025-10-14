import { clsx } from "clsx";
import { differenceInDays, differenceInMonths, format, isPast, startOfDay } from "date-fns";
import { CalendarIcon, ExternalLink, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import * as persisted from "../../../store/tinybase/persisted";
import { Tab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { InteractiveButton } from "../../interactive-button";

type TimelineItem =
  | { type: "event"; id: string; date: string; data: persisted.Event }
  | { type: "session"; id: string; date: string; data: persisted.Session };

export function TimelineView() {
  const buckets = useTimelineData();
  const todaySectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTodayVisible, setIsTodayVisible] = useState(true);
  const [isScrolledPastToday, setIsScrolledPastToday] = useState(false);

  const hasToday = buckets.some(bucket => bucket.label === "Today");

  useEffect(() => {
    const section = todaySectionRef.current;
    const container = containerRef.current;
    if (section && container) {
      container.scrollTo({ top: section.offsetTop });
    }
  }, []);

  useEffect(() => {
    const section = todaySectionRef.current;
    const container = containerRef.current;
    if (!section || !container) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const containerRect = container.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();

        setIsTodayVisible(entry.isIntersecting);
        setIsScrolledPastToday(sectionRect.top < containerRect.top);
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [buckets]);

  const scrollToToday = useCallback(() => {
    const section = todaySectionRef.current;
    const container = containerRef.current;
    if (section && container) {
      container.scrollTo({ top: section.offsetTop, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="flex flex-col h-full overflow-y-auto bg-gray-50 rounded-lg">
        {buckets.map((bucket) => (
          <div key={bucket.label} ref={bucket.label === "Today" ? todaySectionRef : undefined}>
            <div className="sticky top-0 z-30 bg-gray-50 px-2 py-1">
              <DateHeader label={bucket.label} />
            </div>
            {bucket.items.map((item) => (
              <TimelineItemComponent
                key={`${item.type}-${item.id}`}
                item={item}
              />
            ))}
          </div>
        ))}
      </div>

      {hasToday && !isTodayVisible && (
        <Button
          onClick={scrollToToday}
          size="sm"
          className={clsx([
            "absolute left-1/2 transform -translate-x-1/2 rounded-full shadow-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 z-40 flex items-center gap-1",
            isScrolledPastToday ? "top-2" : "bottom-2",
          ])}
          variant="outline"
        >
          <CalendarIcon size={14} />
          <span className="text-xs">Go to Today</span>
        </Button>
      )}
    </div>
  );
}

function DateHeader({ label }: { label: string }) {
  return <div className="text-base font-bold text-gray-900">{label}</div>;
}

function TimelineItemComponent({ item }: { item: TimelineItem }) {
  const { currentTab, openCurrent, openNew } = useTabs();
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const title = item.data.title || "Untitled";
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
      <ContextMenuItem onClick={() => handleCmdClick()}>
        <ExternalLink className="w-4 h-4 mr-2" />
        New Tab
      </ContextMenuItem>
      <ContextMenuItem className="text-red-500" onClick={() => console.log("Delete:", item.type, item.id)}>
        <Trash2 className="w-4 h-4 mr-2 text-red-500" />
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

function getBucketInfo(date: Date): { label: string; sortKey: number } {
  const now = startOfDay(new Date());
  const targetDay = startOfDay(date);
  const daysDiff = differenceInDays(targetDay, now);

  const sortKey = targetDay.getTime();

  if (daysDiff === 0) {
    return { label: "Today", sortKey };
  }

  if (daysDiff === -1) {
    return { label: "Yesterday", sortKey };
  }

  if (daysDiff === 1) {
    return { label: "Tomorrow", sortKey };
  }

  if (daysDiff >= -6 && daysDiff <= -2) {
    const absDays = Math.abs(daysDiff);
    return { label: `${absDays} days ago`, sortKey };
  }

  if (daysDiff >= 2 && daysDiff <= 6) {
    return { label: `in ${daysDiff} days`, sortKey };
  }

  if (daysDiff >= -27 && daysDiff <= -7) {
    const weeks = Math.round(Math.abs(daysDiff) / 7);
    const weekStart = startOfDay(new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000));
    const weekSortKey = weekStart.getTime();

    if (weeks === 1) {
      return { label: "a week ago", sortKey: weekSortKey };
    }
    return { label: `${weeks} weeks ago`, sortKey: weekSortKey };
  }

  if (daysDiff >= 7 && daysDiff <= 27) {
    const weeks = Math.round(daysDiff / 7);
    const weekStart = startOfDay(new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000));
    const weekSortKey = weekStart.getTime();

    if (weeks === 1) {
      return { label: "next week", sortKey: weekSortKey };
    }
    return { label: `in ${weeks} weeks`, sortKey: weekSortKey };
  }

  if (daysDiff < -27) {
    const months = Math.abs(differenceInMonths(targetDay, now));
    const monthStart = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const monthSortKey = monthStart.getTime();

    if (months === 1) {
      return { label: "a month ago", sortKey: monthSortKey };
    }
    return { label: `${months} months ago`, sortKey: monthSortKey };
  }

  const months = differenceInMonths(targetDay, now);
  const monthStart = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const monthSortKey = monthStart.getTime();

  if (months === 1) {
    return { label: "next month", sortKey: monthSortKey };
  }
  return { label: `in ${months} months`, sortKey: monthSortKey };
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

    const bucketMap = new Map<string, { sortKey: number; items: TimelineItem[] }>();

    items.forEach((item) => {
      const itemDate = new Date(item.date);
      const bucket = getBucketInfo(itemDate);

      if (!bucketMap.has(bucket.label)) {
        bucketMap.set(bucket.label, { sortKey: bucket.sortKey, items: [] });
      }
      bucketMap.get(bucket.label)!.items.push(item);
    });

    return Array.from(bucketMap.entries())
      .sort((a, b) => b[1].sortKey - a[1].sortKey)
      .map(([label, value]) => ({ label, items: value.items }));
  }, [eventsWithoutSessionTable, sessionsWithMaybeEventTable]);
}
