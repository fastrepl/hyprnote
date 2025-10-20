import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { clsx } from "clsx";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { type ReactNode, useMemo } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { buildTimelineBuckets } from "../../../../utils/timeline";
import type { TimelineBucket, TimelineItem, TimelinePrecision } from "../../../../utils/timeline";
import { useAnchor, useAutoScrollToAnchor } from "./anchor";
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
    anchorNode: todayAnchorNode,
  } = useAnchor();

  const todayBucketLength = useMemo(() => {
    const b = buckets.find(bucket => bucket.label === "Today");
    return b?.items.length ?? 0;
  }, [buckets]);

  useAutoScrollToAnchor({
    scrollFn: scrollToToday,
    isVisible: isTodayVisible,
    anchorNode: todayAnchorNode,
    deps: [todayBucketLength],
  });

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
          onClick={scrollToToday}
          size="sm"
          className={clsx([
            "absolute left-1/2 transform -translate-x-1/2",
            "rounded-full bg-white hover:bg-gray-50",
            "text-gray-700 border border-gray-200",
            "z-40 flex items-center gap-1",
            "shadow-[inset_0_-4px_6px_-1px_rgba(255,0,0,0.1),inset_0_-2px_4px_-2px_rgba(255,0,0,0.1)]",
            isScrolledPastToday ? "top-2" : "bottom-2",
          ])}
          variant="outline"
        >
          {!isScrolledPastToday ? <ChevronDownIcon size={12} /> : <ChevronUpIcon size={12} />}
          <span className="text-xs">Go back to now</span>
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
