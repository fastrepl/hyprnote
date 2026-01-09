import { useVirtualizer } from "@tanstack/react-virtual";
import { startOfDay } from "date-fns";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useMemo, useRef } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/store/main";
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

type VirtualRow =
  | { type: "bucket-header"; label: string; bucketIndex: number }
  | {
      type: "item";
      item: TimelineItem;
      precision: TimelinePrecision;
      bucketLabel: string;
      bucketIndex: number;
    }
  | { type: "indicator"; bucketLabel: string; position: "before" | "within" };

export function TimelineView() {
  const buckets = useTimelineData();
  const currentTimeMs = useCurrentTimeMs();
  const parentRef = useRef<HTMLDivElement>(null);

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

  const virtualRows = useMemo(() => {
    const rows: VirtualRow[] = [];
    const todayTimestamp = startOfDay(new Date()).getTime();
    let indicatorPlaced = false;

    buckets.forEach((bucket, bucketIndex) => {
      const isToday = bucket.label === "Today";
      const shouldRenderIndicatorBefore =
        !hasToday &&
        !indicatorPlaced &&
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
        })();

      if (shouldRenderIndicatorBefore) {
        rows.push({
          type: "indicator",
          bucketLabel: bucket.label,
          position: "before",
        });
        indicatorPlaced = true;
      }

      rows.push({ type: "bucket-header", label: bucket.label, bucketIndex });

      if (isToday) {
        const entries = bucket.items.map((item) => ({
          item,
          timestamp: getItemTimestamp(item),
        }));

        const indicatorIndex = calculateIndicatorIndex(entries, new Date());

        if (entries.length === 0) {
          rows.push({
            type: "indicator",
            bucketLabel: bucket.label,
            position: "within",
          });
        } else {
          entries.forEach((entry, idx) => {
            if (idx === indicatorIndex) {
              rows.push({
                type: "indicator",
                bucketLabel: bucket.label,
                position: "within",
              });
            }
            rows.push({
              type: "item",
              item: entry.item,
              precision: bucket.precision,
              bucketLabel: bucket.label,
              bucketIndex,
            });
          });

          if (indicatorIndex === entries.length) {
            rows.push({
              type: "indicator",
              bucketLabel: bucket.label,
              position: "within",
            });
          }
        }
      } else {
        bucket.items.forEach((item) => {
          rows.push({
            type: "item",
            item,
            precision: bucket.precision,
            bucketLabel: bucket.label,
            bucketIndex,
          });
        });
      }
    });

    if (!hasToday && !indicatorPlaced) {
      rows.push({
        type: "indicator",
        bucketLabel: "end",
        position: "before",
      });
    }

    return rows;
  }, [buckets, hasToday, currentTimeMs]);

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = virtualRows[index];
      if (row.type === "bucket-header") return 40;
      if (row.type === "indicator") return 20;
      return 48;
    },
    overscan: 5,
  });

  return (
    <div className="relative h-full">
      <div
        ref={(node) => {
          parentRef.current = node;
          containerRef.current = node;
        }}
        className={cn([
          "flex flex-col h-full overflow-y-auto scrollbar-hide",
          "bg-neutral-50 rounded-xl",
        ])}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row = virtualRows[virtualItem.index];

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {row.type === "bucket-header" && (
                  <div
                    className={cn([
                      "sticky top-0 z-10",
                      "bg-neutral-50 pl-3 pr-1 py-1",
                    ])}
                  >
                    <div className="text-base font-bold text-neutral-900">
                      {row.label}
                    </div>
                  </div>
                )}

                {row.type === "indicator" && (
                  <CurrentTimeIndicator ref={setCurrentTimeIndicatorRef} />
                )}

                {row.type === "item" && (
                  <TimelineItemComponent
                    item={row.item}
                    precision={row.precision}
                    selected={
                      row.item.type === "session"
                        ? row.item.id === selectedSessionId
                        : row.item.id === selectedEventId
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
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
