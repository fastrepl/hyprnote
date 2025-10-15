import { clsx } from "clsx";
import { CalendarIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import * as persisted from "../../../../store/tinybase/persisted";
import { buildTimelineBuckets } from "../../../../utils/timeline";
import type { TimelineBucket, TimelineItem, TimelinePrecision } from "../../../../utils/timeline";
import { TimelineItemComponent } from "./item";
import { CurrentTimeIndicator, useCurrentTime } from "./realtime";

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
