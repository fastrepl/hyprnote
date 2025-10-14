import { clsx } from "clsx";
import { CalendarIcon, ExternalLink, Trash2 } from "lucide-react";
import { forwardRef, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import * as persisted from "../../../store/tinybase/persisted";
import { Tab, useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";
import { buildTimelineBuckets } from "../../../utils/timeline";
import type { TimelineBucket, TimelineItem, TimelinePrecision } from "../../../utils/timeline";
import { InteractiveButton } from "../../interactive-button";

export function TimelineView() {
  const buckets = useTimelineData();
  const currentTime = useCurrentTime();
  const {
    containerRef,
    isTodayVisible,
    isScrolledPastToday,
    scrollToToday,
    hasToday,
    setCurrentTimeIndicatorRef,
  } = useTimelineScroll(buckets);

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="flex flex-col h-full overflow-y-auto bg-gray-50 rounded-lg">
        {buckets.map((bucket) => {
          const isToday = bucket.label === "Today";

          return (
            <div key={bucket.label}>
              <div className="sticky top-0 z-30 bg-gray-50 px-2 py-1">
                <DateHeader label={bucket.label} />
              </div>
              {isToday
                ? (
                  <TodayBucket
                    items={bucket.items}
                    precision={bucket.precision}
                    currentTime={currentTime}
                    registerIndicator={setCurrentTimeIndicatorRef}
                  />
                )
                : (
                  bucket.items.map((item) => (
                    <TimelineItemComponent
                      key={`${item.type}-${item.id}`}
                      item={item}
                      precision={bucket.precision}
                    />
                  ))
                )}
            </div>
          );
        })}
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

function useTimelineScroll(buckets: TimelineBucket[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTodayVisible, setIsTodayVisible] = useState(true);
  const [isScrolledPastToday, setIsScrolledPastToday] = useState(false);
  const [indicatorNode, setIndicatorNode] = useState<HTMLDivElement | null>(null);

  const hasToday = useMemo(() => buckets.some(bucket => bucket.label === "Today"), [buckets]);

  const setCurrentTimeIndicatorRef = useCallback((node: HTMLDivElement | null) => {
    setIndicatorNode(prevNode => (prevNode === node ? prevNode : node));
  }, []);

  const scrollToToday = useCallback(() => {
    const container = containerRef.current;
    if (!container || !indicatorNode) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const indicatorRect = indicatorNode.getBoundingClientRect();
    const indicatorCenter = indicatorRect.top - containerRect.top + container.scrollTop + (indicatorRect.height / 2);
    const targetScrollTop = Math.max(indicatorCenter - (container.clientHeight / 2), 0);
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  }, [indicatorNode]);

  useEffect(() => {
    if (!hasToday) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToToday();
    });
  }, [hasToday, scrollToToday]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !indicatorNode) {
      setIsTodayVisible(true);
      setIsScrolledPastToday(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const containerRect = container.getBoundingClientRect();
        const indicatorRect = indicatorNode.getBoundingClientRect();

        setIsTodayVisible(entry.isIntersecting);
        setIsScrolledPastToday(indicatorRect.top < containerRect.top);
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(indicatorNode);

    return () => observer.disconnect();
  }, [indicatorNode]);

  return {
    containerRef,
    isTodayVisible,
    isScrolledPastToday,
    scrollToToday,
    hasToday,
    setCurrentTimeIndicatorRef,
  };
}

function DateHeader({ label }: { label: string }) {
  return <div className="text-base font-bold text-gray-900">{label}</div>;
}

function TimelineItemComponent({ item, precision }: { item: TimelineItem; precision: TimelinePrecision }) {
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
  const displayTime = useMemo(() => {
    if (!timestamp) {
      return "";
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "numeric" });

    if (precision === "time") {
      return time;
    }

    const sameYear = date.getFullYear() === new Date().getFullYear();
    const dateStr = sameYear
      ? date.toLocaleDateString([], { month: "short", day: "numeric" })
      : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    return `${dateStr}, ${time}`;
  }, [timestamp, precision]);

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

function TodayBucket({
  items,
  precision,
  currentTime,
  registerIndicator,
}: {
  items: TimelineItem[];
  precision: TimelinePrecision;
  currentTime: Date;
  registerIndicator: (node: HTMLDivElement | null) => void;
}) {
  const entries = useMemo(
    () => items.map((timelineItem) => ({ item: timelineItem, timestamp: getItemTimestamp(timelineItem) })),
    [items],
  );

  const currentTimeMs = currentTime.getTime();

  const indicatorIndex = useMemo(() => {
    for (let index = 0; index < entries.length; index += 1) {
      const timestamp = entries[index].timestamp;

      if (!timestamp) {
        return index;
      }

      if (timestamp.getTime() < currentTimeMs) {
        return index;
      }
    }

    return entries.length;
  }, [entries, currentTimeMs]);

  if (entries.length === 0) {
    return (
      <>
        <CurrentTimeIndicator ref={registerIndicator} />
        <div className="px-3 py-4 text-sm text-gray-400 text-center">
          No items today
        </div>
      </>
    );
  }

  return (
    <>
      {entries.map((entry, index) => (
        <Fragment key={`${entry.item.type}-${entry.item.id}`}>
          {index === indicatorIndex && <CurrentTimeIndicator ref={registerIndicator} />}
          <TimelineItemComponent item={entry.item} precision={precision} />
        </Fragment>
      ))}
      {indicatorIndex === entries.length && <CurrentTimeIndicator ref={registerIndicator} />}
    </>
  );
}

function useTimelineData(): TimelineBucket[] {
  const eventsWithoutSessionTable = persisted.UI.useResultTable(
    persisted.QUERIES.eventsWithoutSession,
    persisted.STORE_ID,
  );
  const sessionsWithMaybeEventTable = persisted.UI.useResultTable(
    persisted.QUERIES.sessionsWithMaybeEvent,
    persisted.STORE_ID,
  );

  return useMemo(
    () =>
      buildTimelineBuckets({
        eventsWithoutSessionTable,
        sessionsWithMaybeEventTable,
      }),
    [eventsWithoutSessionTable, sessionsWithMaybeEventTable],
  );
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return now;
}

function getItemTimestamp(item: TimelineItem): Date | null {
  const value = item.type === "event" ? item.data.started_at : item.data.created_at;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

const CurrentTimeIndicator = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="px-3 py-2" aria-hidden>
    <div className="h-px bg-red-500" />
  </div>
));

CurrentTimeIndicator.displayName = "CurrentTimeIndicator";
