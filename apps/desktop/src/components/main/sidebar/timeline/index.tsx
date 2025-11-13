import { startOfDay } from "date-fns";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { type ReactNode, useMemo } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { useTabs } from "../../../../store/zustand/tabs";
import {
  buildTimelineBuckets,
  calculateIndicatorIndex,
  type TimelineBucket,
  type TimelineItem,
  type TimelinePrecision,
} from "../../../../utils/timeline";
import { useAnchor, useAutoScrollToAnchor } from "./anchor";
import { TimelineItemComponent } from "./item";
import { CurrentTimeIndicator, useCurrentTimeMs } from "./realtime";

export function TimelineView() {
  const buckets = useTimelineData();
  const hasToday = useMemo(
    () => buckets.some((bucket) => bucket.label === "Today"),
    [buckets],
  );

  const currentTab = useTabs((state) => state.currentTab);
  const store = main.UI.useStore(main.STORE_ID);

  const selectedSessionId = useMemo(() => {
    return currentTab?.type === "sessions" ? currentTab.id : undefined;
  }, [currentTab]);

  const selectedEventId = useMemo(() => {
    if (!selectedSessionId || !store) {
      return undefined;
    }
    const session = store.getRow("sessions", selectedSessionId);
    return session?.event_id ? String(session.event_id) : undefined;
  }, [selectedSessionId, store]);

  const {
    containerRef,
    isAnchorVisible: isTodayVisible,
    isScrolledPastAnchor: isScrolledPastToday,
    scrollToAnchor: scrollToToday,
    registerAnchor: setCurrentTimeIndicatorRef,
    anchorNode: todayAnchorNode,
  } = useAnchor();

  const todayBucketLength = useMemo(() => {
    const b = buckets.find((bucket) => bucket.label === "Today");
    return b?.items.length ?? 0;
  }, [buckets]);

  useAutoScrollToAnchor({
    scrollFn: scrollToToday,
    isVisible: isTodayVisible,
    anchorNode: todayAnchorNode,
    deps: [todayBucketLength],
  });

  const todayTimestamp = useMemo(() => startOfDay(new Date()).getTime(), []);
  const indicatorIndex = useMemo(() => {
    if (hasToday) {
      return -1;
    }
    return buckets.findIndex(
      (bucket) =>
        bucket.items.length > 0 &&
        (() => {
          const firstItem = bucket.items[0];
          const timestamp =
            firstItem.type === "event"
              ? firstItem.data.started_at
              : firstItem.data.created_at;
          if (!timestamp) {
            return false;
          }
          const itemDate = new Date(timestamp);
          return itemDate.getTime() < todayTimestamp;
        })(),
    );
  }, [buckets, hasToday, todayTimestamp]);

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className={cn([
          "flex flex-col h-full overflow-y-auto scrollbar-hide",
          "bg-neutral-50 rounded-lg",
        ])}
      >
        {buckets.map((bucket, index) => {
          const isToday = bucket.label === "Today";
          const shouldRenderIndicatorBefore =
            !hasToday && indicatorIndex === index;

          return (
            <div key={bucket.label}>
              {shouldRenderIndicatorBefore && (
                <CurrentTimeIndicator ref={setCurrentTimeIndicatorRef} />
              )}
              <div
                className={cn(["sticky top-0 z-10", "bg-neutral-50 px-2 py-1"])}
              >
                <div className="text-base font-bold text-neutral-900">
                  {bucket.label}
                </div>
              </div>
              {isToday ? (
                <TodayBucket
                  items={bucket.items}
                  precision={bucket.precision}
                  registerIndicator={setCurrentTimeIndicatorRef}
                  selectedSessionId={selectedSessionId}
                  selectedEventId={selectedEventId}
                />
              ) : (
                bucket.items.map((item) => {
                  const selected =
                    item.type === "session"
                      ? item.id === selectedSessionId
                      : item.id === selectedEventId;
                  return (
                    <TimelineItemComponent
                      key={`${item.type}-${item.id}`}
                      item={item}
                      precision={bucket.precision}
                      selected={selected}
                    />
                  );
                })
              )}
            </div>
          );
        })}
        {!hasToday &&
          (indicatorIndex === -1 || indicatorIndex === buckets.length) && (
            <CurrentTimeIndicator ref={setCurrentTimeIndicatorRef} />
          )}
      </div>

      {!isTodayVisible && (
        <Button
          onClick={scrollToToday}
          size="sm"
          className={cn([
            "absolute left-1/2 transform -translate-x-1/2",
            "rounded-full bg-white hover:bg-neutral-50",
            "text-neutral-700 border border-neutral-200",
            "z-20 flex items-center gap-1",
            "shadow-[inset_0_-4px_6px_-1px_rgba(255,0,0,0.1),inset_0_-2px_4px_-2px_rgba(255,0,0,0.1)]",
            isScrolledPastToday ? "top-2" : "bottom-2",
          ])}
          variant="outline"
        >
          {!isScrolledPastToday ? (
            <ChevronDownIcon size={12} />
          ) : (
            <ChevronUpIcon size={12} />
          )}
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
  selectedSessionId,
  selectedEventId,
}: {
  items: TimelineItem[];
  precision: TimelinePrecision;
  registerIndicator: (node: HTMLDivElement | null) => void;
  selectedSessionId: string | undefined;
  selectedEventId: string | undefined;
}) {
  const currentTimeMs = useCurrentTimeMs();

  const entries = useMemo(
    () =>
      items.map((timelineItem) => ({
        item: timelineItem,
        timestamp: getItemTimestamp(timelineItem),
      })),
    [items],
  );

  const indicatorIndex = useMemo(
    // currentTimeMs in deps triggers updates as time passes,
    // but we use fresh Date() so indicator positions correctly when entries change immediately (new note).
    () => calculateIndicatorIndex(entries, new Date()),
    [entries, currentTimeMs],
  );

  const renderedEntries = useMemo(() => {
    if (entries.length === 0) {
      return (
        <>
          <CurrentTimeIndicator ref={registerIndicator} />
          <div className="px-3 py-4 text-sm text-neutral-400 text-center">
            No items today
          </div>
        </>
      );
    }

    const nodes: ReactNode[] = [];

    entries.forEach((entry, index) => {
      if (index === indicatorIndex) {
        nodes.push(
          <CurrentTimeIndicator
            ref={registerIndicator}
            key="current-time-indicator"
          />,
        );
      }

      const selected =
        entry.item.type === "session"
          ? entry.item.id === selectedSessionId
          : entry.item.id === selectedEventId;

      nodes.push(
        <TimelineItemComponent
          key={`${entry.item.type}-${entry.item.id}`}
          item={entry.item}
          precision={precision}
          selected={selected}
        />,
      );
    });

    if (indicatorIndex === entries.length) {
      nodes.push(
        <CurrentTimeIndicator
          ref={registerIndicator}
          key="current-time-indicator-end"
        />,
      );
    }

    return <>{nodes}</>;
  }, [
    entries,
    indicatorIndex,
    precision,
    registerIndicator,
    selectedSessionId,
    selectedEventId,
  ]);

  return renderedEntries;
}

function useTimelineData(): TimelineBucket[] {
  const eventsWithoutSessionTable = main.UI.useResultTable(
    main.QUERIES.eventsWithoutSession,
    main.STORE_ID,
  );
  const sessionsWithMaybeEventTable = main.UI.useResultTable(
    main.QUERIES.sessionsWithMaybeEvent,
    main.STORE_ID,
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
  const value =
    item.type === "event" ? item.data.started_at : item.data.created_at;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
