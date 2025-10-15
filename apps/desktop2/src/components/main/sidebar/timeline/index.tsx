import { clsx } from "clsx";
import { CalendarIcon } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import * as persisted from "../../../../store/tinybase/persisted";
import { buildTimelineBuckets } from "../../../../utils/timeline";
import type { TimelineBucket, TimelineItem, TimelinePrecision } from "../../../../utils/timeline";
import { useAnchor } from "./anchor";
import { TimelineItemComponent } from "./item";
import { CurrentTimeIndicator, useCurrentTime } from "./realtime";

export function TimelineView() {
  const buckets = useTimelineData();
  const hasToday = useMemo(() => buckets.some(bucket => bucket.label === "Today"), [buckets]);

  const {
    containerRef,
    isAnchorVisible: isTodayVisible,
    isScrolledPastAnchor: isScrolledPastToday,
    scrollToAnchor: scrollToToday,
    registerAnchor: setCurrentTimeIndicatorRef,
  } = useAnchor({ isAnchorActive: hasToday, autoScrollOnMount: true });

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className={cn([
          "flex flex-col h-full overflow-y-auto",
          "bg-gray-50 rounded-lg",
        ])}
      >
        {buckets.map((bucket) => {
          const isToday = bucket.label === "Today";

          return (
            <div key={bucket.label}>
              <div
                className={cn([
                  "sticky top-0 z-30",
                  "bg-gray-50 px-2 py-1",
                ])}
              >
                <div className="text-base font-bold text-gray-900">{bucket.label}</div>
              </div>
              {isToday
                ? (
                  <TodayBucket
                    items={bucket.items}
                    precision={bucket.precision}
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
          size="sm"
          variant="outline"
          onClick={scrollToToday}
          className={clsx([
            "group",
            "relative",
            "absolute left-1/2 transform -translate-x-1/2",
            "bg-white hover:bg-gray-50",
            "border border-gray-200",
            "rounded-full shadow-lg",
            "text-gray-700 z-40",
            isScrolledPastToday ? "top-2" : "bottom-2",
          ])}
        >
          <div className="flex flex-row items-center gap-1">
            <CalendarIcon size={14} />
            <span className="text-xs">Go to Today</span>
          </div>
          <span
            className={cn([
              "absolute w-[80%] h-[1px]",
              "bg-red-400 group-hover:bg-red-500",
              isScrolledPastToday ? "bottom-1" : "top-1",
            ])}
          />
        </Button>
      )}
    </div>
  );
}

function TodayBucket({
  items,
  precision,
  registerIndicator,
}: {
  items: TimelineItem[];
  precision: TimelinePrecision;
  registerIndicator: (node: HTMLDivElement | null) => void;
}) {
  const currentTimeMs = useCurrentTime().getTime();

  const entries = useMemo(
    () =>
      items.map((timelineItem) => ({
        item: timelineItem,
        timestamp: getItemTimestamp(timelineItem),
      })),
    [items],
  );

  const indicatorIndex = useMemo(() => {
    const index = entries.findIndex(({ timestamp }) => {
      if (!timestamp) {
        return true;
      }

      return timestamp.getTime() < currentTimeMs;
    });

    if (index === -1) {
      return entries.length;
    }

    return index;
  }, [entries, currentTimeMs]);

  const renderedEntries = useMemo(() => {
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

    const nodes: ReactNode[] = [];

    entries.forEach((entry, index) => {
      if (index === indicatorIndex) {
        nodes.push(<CurrentTimeIndicator ref={registerIndicator} key="current-time-indicator" />);
      }

      nodes.push(
        <TimelineItemComponent
          key={`${entry.item.type}-${entry.item.id}`}
          item={entry.item}
          precision={precision}
        />,
      );
    });

    if (indicatorIndex === entries.length) {
      nodes.push(<CurrentTimeIndicator ref={registerIndicator} key="current-time-indicator-end" />);
    }

    return <>{nodes}</>;
  }, [entries, indicatorIndex, precision, registerIndicator]);

  return renderedEntries;
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
