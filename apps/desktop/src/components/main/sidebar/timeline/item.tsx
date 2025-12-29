import { memo, useCallback, useMemo } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
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
import { type TabInput, useTabs } from "../../../../store/zustand/tabs";
import { id } from "../../../../utils";
import {
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
    const store = main.UI.useStore(main.STORE_ID);
    const indexes = main.UI.useIndexes(main.STORE_ID);

    const eventId =
      item.type === "event" ? item.id : item.data.event_id || undefined;
    const title = item.data.title || "Untitled";
    const timestamp =
      item.type === "event" ? item.data.started_at : item.data.created_at;

    const sessionId = item.type === "session" ? item.id : null;
    const sessionMode = useListener((state) =>
      sessionId ? state.getSessionMode(sessionId) : "inactive",
    );
    const isEnhancing = useIsSessionEnhancing(sessionId ?? "");
    const isFinalizing = sessionMode === "finalizing";
    const showSpinner = isFinalizing || isEnhancing;

    const calendarId = useMemo(() => {
      if (!store || !eventId) {
        return null;
      }
      if (item.type === "event") {
        return item.data.calendar_id ?? null;
      }
      if (item.data.event_id) {
        const event = store.getRow("events", item.data.event_id);
        return event?.calendar_id ? String(event.calendar_id) : null;
      }
      return null;
    }, [store, eventId, item]);

    const displayTime = useMemo(
      () => formatDisplayTime(timestamp, precision),
      [timestamp, precision],
    );

    const { handleClick, handleCmdClick, handleDelete } =
      useTimelineItemActions(item, store, indexes, eventId, title);

    const contextMenu = useMemo(
      () => [
        { id: "open-new-tab", text: "Open in New Tab", action: handleCmdClick },
        { id: "delete", text: "Delete Completely", action: handleDelete },
      ],
      [handleCmdClick, handleDelete],
    );

    return (
      <InteractiveButton
        onClick={handleClick}
        onCmdClick={handleCmdClick}
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

function useTimelineItemActions(
  item: TimelineItem,
  store: ReturnType<typeof main.UI.useStore>,
  indexes: ReturnType<typeof main.UI.useIndexes>,
  eventId: string | undefined,
  title: string,
) {
  const openCurrent = useTabs((state) => state.openCurrent);
  const openNew = useTabs((state) => state.openNew);
  const invalidateResource = useTabs((state) => state.invalidateResource);

  const handleEventClick = useCallback(
    (openInNewTab: boolean) => {
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
        const tab: TabInput = { id: existingSessionId, type: "sessions" };
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
        void analyticsCommands.event({
          event: "note_created",
          has_event_id: true,
        });
        const tab: TabInput = { id: sessionId, type: "sessions" };
        if (openInNewTab) {
          openNew(tab);
        } else {
          openCurrent(tab);
        }
      }
    },
    [eventId, store, title, openCurrent, openNew],
  );

  const handleClick = useCallback(() => {
    if (item.type === "event") {
      handleEventClick(false);
    } else {
      openCurrent({ id: item.id, type: "sessions" });
    }
  }, [item, handleEventClick, openCurrent]);

  const handleCmdClick = useCallback(() => {
    if (item.type === "event") {
      handleEventClick(true);
    } else {
      openNew({ id: item.id, type: "sessions" });
    }
  }, [item, handleEventClick, openNew]);

  const handleDelete = useCallback(() => {
    if (!store) {
      return;
    }
    if (item.type === "event") {
      invalidateResource("events", item.id);
      store.delRow("events", item.id);
    } else {
      invalidateResource("sessions", item.id);
      void deleteSessionCascade(store, indexes, item.id);
    }
  }, [store, indexes, item.id, item.type, invalidateResource]);

  return { handleClick, handleCmdClick, handleDelete };
}
