import { memo, useCallback, useMemo } from "react";

import { Spinner } from "@hypr/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../contexts/listener";
import { useIsSessionEnhancing } from "../../../../hooks/useEnhancedNotes";
import { deleteSessionCascade } from "../../../../store/tinybase/deleteSession";
import * as main from "../../../../store/tinybase/main";
import { getOrCreateSessionForEventId } from "../../../../store/tinybase/sessions";
import { type TabInput, useTabs } from "../../../../store/zustand/tabs";
import {
  type EventTimelineItem,
  type SessionTimelineItem,
  type TimelineItem,
  TimelinePrecision,
} from "../../../../utils/timeline";
import { InteractiveButton } from "../../../interactive-button";

export const TimelineItemComponent = memo(
  ({
    item,
    precision,
    selected,
  }: {
    item: TimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
  }) => {
    if (item.type === "event") {
      return (
        <EventItem item={item} precision={precision} selected={selected} />
      );
    }
    return (
      <SessionItem item={item} precision={precision} selected={selected} />
    );
  },
);

function ItemBase({
  title,
  displayTime,
  calendarId,
  showSpinner,
  selected,
  onClick,
  onCmdClick,
  contextMenu,
}: {
  title: string;
  displayTime: string;
  calendarId: string | null;
  showSpinner?: boolean;
  selected: boolean;
  onClick: () => void;
  onCmdClick: () => void;
  contextMenu: Array<{ id: string; text: string; action: () => void }>;
}) {
  return (
    <InteractiveButton
      onClick={onClick}
      onCmdClick={onCmdClick}
      contextMenu={contextMenu}
      className={cn([
        "w-full text-left px-3 py-2 rounded-lg",
        selected && "bg-neutral-200",
        !selected && "hover:bg-neutral-100",
      ])}
    >
      <div className="flex items-center gap-2">
        {showSpinner && (
          <div className="flex-shrink-0">
            <Spinner size={14} />
          </div>
        )}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="text-sm font-normal truncate">{title}</div>
          {displayTime && (
            <div className="text-xs text-neutral-500">{displayTime}</div>
          )}
        </div>
        {calendarId && <CalendarIndicator calendarId={calendarId} />}
      </div>
    </InteractiveButton>
  );
}

const EventItem = memo(
  ({
    item,
    precision,
    selected,
  }: {
    item: EventTimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
  }) => {
    const store = main.UI.useStore(main.STORE_ID);
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);

    const eventId = item.id;
    const title = item.data.title || "Untitled";
    const calendarId = item.data.calendar_id ?? null;
    const recurrenceSeriesId = item.data.recurrence_series_id;
    const displayTime = useMemo(
      () => formatDisplayTime(item.data.started_at, precision),
      [item.data.started_at, precision],
    );

    const openEvent = useCallback(
      (openInNewTab: boolean) => {
        if (!store) {
          return;
        }

        const sessionId = getOrCreateSessionForEventId(store, eventId, title);
        const tab: TabInput = { id: sessionId, type: "sessions" };
        openInNewTab ? openNew(tab) : openCurrent(tab);
      },
      [eventId, store, title, openCurrent, openNew],
    );

    const handleClick = useCallback(() => openEvent(false), [openEvent]);
    const handleCmdClick = useCallback(() => openEvent(true), [openEvent]);

    const handleIgnore = main.UI.useSetPartialRowCallback(
      "events",
      eventId,
      () => ({ ignored: true }),
      [],
      main.STORE_ID,
    );

    const handleIgnoreSeries = useCallback(() => {
      if (!store || !recurrenceSeriesId) {
        return;
      }
      store.transaction(() => {
        store.forEachRow("events", (rowId, _forEachCell) => {
          const event = store.getRow("events", rowId);
          if (event?.recurrence_series_id === recurrenceSeriesId) {
            store.setPartialRow("events", rowId, { ignored: true });
          }
        });

        const currentIgnored = store.getValue("ignored_recurring_series");
        const ignoredList: string[] = currentIgnored
          ? JSON.parse(String(currentIgnored))
          : [];
        if (!ignoredList.includes(recurrenceSeriesId)) {
          ignoredList.push(recurrenceSeriesId);
          store.setValue(
            "ignored_recurring_series",
            JSON.stringify(ignoredList),
          );
        }
      });
    }, [store, recurrenceSeriesId]);

    const contextMenu = useMemo(() => {
      const menu = [
        { id: "ignore", text: "Ignore this event", action: handleIgnore },
      ];
      if (recurrenceSeriesId) {
        menu.push({
          id: "ignore-series",
          text: "Ignore all recurring events",
          action: handleIgnoreSeries,
        });
      }
      return menu;
    }, [handleIgnore, handleIgnoreSeries, recurrenceSeriesId]);

    return (
      <ItemBase
        title={title}
        displayTime={displayTime}
        calendarId={calendarId}
        selected={selected}
        onClick={handleClick}
        onCmdClick={handleCmdClick}
        contextMenu={contextMenu}
      />
    );
  },
);

const SessionItem = memo(
  ({
    item,
    precision,
    selected,
  }: {
    item: SessionTimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
  }) => {
    const store = main.UI.useStore(main.STORE_ID);
    const indexes = main.UI.useIndexes(main.STORE_ID);
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);
    const invalidateResource = useTabs((state) => state.invalidateResource);

    const sessionId = item.id;
    const title = item.data.title || "Untitled";

    const sessionMode = useListener((state) => state.getSessionMode(sessionId));
    const isEnhancing = useIsSessionEnhancing(sessionId);
    const isFinalizing = sessionMode === "finalizing";
    const showSpinner = isFinalizing || isEnhancing;

    const calendarId = useMemo(() => {
      if (!store || !item.data.event_id) {
        return null;
      }
      const event = store.getRow("events", item.data.event_id);
      return event?.calendar_id ? String(event.calendar_id) : null;
    }, [store, item.data.event_id]);

    const displayTime = useMemo(
      () => formatDisplayTime(item.data.created_at, precision),
      [item.data.created_at, precision],
    );

    const handleClick = useCallback(() => {
      openCurrent({ id: sessionId, type: "sessions" });
    }, [sessionId, openCurrent]);

    const handleCmdClick = useCallback(() => {
      openNew({ id: sessionId, type: "sessions" });
    }, [sessionId, openNew]);

    const handleDelete = useCallback(() => {
      if (!store) {
        return;
      }
      invalidateResource("sessions", sessionId);
      void deleteSessionCascade(store, indexes, sessionId);
    }, [store, indexes, sessionId, invalidateResource]);

    const contextMenu = useMemo(
      () => [{ id: "delete", text: "Delete Completely", action: handleDelete }],
      [handleCmdClick, handleDelete],
    );

    return (
      <ItemBase
        title={title}
        displayTime={displayTime}
        calendarId={calendarId}
        showSpinner={showSpinner}
        selected={selected}
        onClick={handleClick}
        onCmdClick={handleCmdClick}
        contextMenu={contextMenu}
      />
    );
  },
);

function formatDisplayTime(
  timestamp: string | null | undefined,
  precision: TimelinePrecision,
): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "numeric",
  });

  if (precision === "time") {
    return time;
  }

  const sameYear = date.getFullYear() === new Date().getFullYear();
  const dateStr = sameYear
    ? date.toLocaleDateString([], { month: "short", day: "numeric" })
    : date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return `${dateStr}, ${time}`;
}

function CalendarIndicator({ calendarId }: { calendarId: string }) {
  const calendar = main.UI.useRow("calendars", calendarId, main.STORE_ID);

  const name = calendar?.name ? String(calendar.name) : undefined;
  const color = calendar?.color ? String(calendar.color) : "#888";

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className="size-2 rounded-full shrink-0 opacity-60"
          style={{ backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {name || "Calendar"}
      </TooltipContent>
    </Tooltip>
  );
}
