import { cn, format, getDay } from "@hypr/utils";

import { useEffect, useRef, useState } from "react";

import * as main from "../../../../store/tinybase/main";
import { TabContentCalendarDayEvents } from "./day-events";
import { TabContentCalendarDayMore } from "./day-more";
import { TabContentCalendarDaySessions } from "./day-sessions";

export function TabContentCalendarDay({
  day,
  isCurrentMonth,
  isFirstColumn,
  isLastRow,
  selectedCalendars,
}: {
  day: string;
  isCurrentMonth: boolean;
  isFirstColumn: boolean;
  isLastRow: boolean;
  selectedCalendars: Set<string>;
}) {
  const cellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxVisibleItems, setMaxVisibleItems] = useState(5);

  const allEventIds = main.UI.useSliceRowIds(
    main.INDEXES.eventsByDate,
    day,
    main.STORE_ID,
  );

  const store = main.UI.useStore(main.STORE_ID);

  const eventIds = allEventIds.filter((eventId) => {
    const event = store?.getRow("events", eventId);
    return event?.calendar_id && selectedCalendars.has(event.calendar_id as string);
  });

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionByDateWithoutEvent,
    day,
    main.STORE_ID,
  );

  const dayNumber = format(new Date(day), "d");
  const isToday = format(new Date(), "yyyy-MM-dd") === day;
  const dayOfWeek = getDay(new Date(day));
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Measure actual available height and calculate max visible items
  useEffect(() => {
    const measureHeight = () => {
      if (cellRef.current && contentRef.current) {
        const cellHeight = cellRef.current.clientHeight;
        const contentTop = contentRef.current.offsetTop;
        const availableHeight = cellHeight - contentTop;
        const EVENT_HEIGHT = 20; // height of each event item (h-5)
        const SPACING = 4; // space-y-1

        // Calculate how many items can fit
        const itemsWithSpacing = Math.floor((availableHeight + SPACING) / (EVENT_HEIGHT + SPACING));
        // Reserve space for "+x more" if needed
        setMaxVisibleItems(Math.max(1, itemsWithSpacing));
      }
    };

    measureHeight();

    // Re-measure on window resize
    window.addEventListener("resize", measureHeight);
    return () => window.removeEventListener("resize", measureHeight);
  }, []);

  const totalItems = eventIds.length + sessionIds.length;
  const visibleCount = totalItems > maxVisibleItems
    ? maxVisibleItems - 1
    : totalItems;
  const hiddenCount = totalItems - visibleCount;

  const allItems = [
    ...eventIds.map(id => ({ type: "event" as const, id })),
    ...sessionIds.map(id => ({ type: "session" as const, id })),
  ];

  const visibleItems = allItems.slice(0, visibleCount);
  const hiddenItems = allItems.slice(visibleCount);

  const hiddenEventIds = hiddenItems
    .filter(item => item.type === "event")
    .map(item => item.id);
  const hiddenSessionIds = hiddenItems
    .filter(item => item.type === "session")
    .map(item => item.id);

  return (
    <div
      ref={cellRef}
      className={cn([
        "relative flex flex-col items-end flex-1 min-w-0 border-neutral-200 p-1 overflow-hidden",
        !isFirstColumn && "border-l",
        !isLastRow && "border-b",
        isWeekend ? "bg-neutral-50" : "bg-white",
      ])}
    >
      <div
        className={cn(
          ["text-sm size-6 rounded-full flex items-center justify-center mb-1", isToday && "bg-red-500"],
        )}
      >
        <span
          className={cn(
            [
              isToday && "text-white font-medium",
              !isToday && !isCurrentMonth && "text-neutral-400",
              !isToday && isCurrentMonth && isWeekend && "text-neutral-500",
              !isToday && isCurrentMonth && !isWeekend && "text-neutral-700",
            ],
          )}
        >
          {dayNumber}
        </span>
      </div>

      <div ref={contentRef} className="flex-1 w-full">
        {visibleItems.map((item) =>
          item.type === "event"
            ? <TabContentCalendarDayEvents key={item.id} eventId={item.id} />
            : <TabContentCalendarDaySessions key={item.id} sessionId={item.id} />
        )}

        {hiddenCount > 0 && (
          <TabContentCalendarDayMore
            day={day}
            eventIds={hiddenEventIds}
            sessionIds={hiddenSessionIds}
            hiddenCount={hiddenCount}
          />
        )}
      </div>
    </div>
  );
}
