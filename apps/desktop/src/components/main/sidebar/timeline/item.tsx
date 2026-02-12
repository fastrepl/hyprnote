import { memo, useCallback, useMemo } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn, format, getYear, safeParseDate, TZDate } from "@hypr/utils";

import { useListener } from "../../../../contexts/listener";
import { useIsSessionEnhancing } from "../../../../hooks/useEnhancedNotes";
import {
  captureSessionData,
  deleteSessionCascade,
} from "../../../../store/tinybase/store/deleteSession";
import * as main from "../../../../store/tinybase/store/main";
import { save } from "../../../../store/tinybase/store/save";
import { getOrCreateSessionForEventId } from "../../../../store/tinybase/store/sessions";
import { type TabInput, useTabs } from "../../../../store/zustand/tabs";
import { useUndoDelete } from "../../../../store/zustand/undo-delete";
import {
  type EventTimelineItem,
  type SessionTimelineItem,
  type TimelineItem,
  TimelinePrecision,
} from "../../../../utils/timeline";
import { InteractiveButton } from "../../../interactive-button";
import { DissolvingContainer } from "../../../ui/dissolving-container";

export const TimelineItemComponent = memo(
  ({
    item,
    precision,
    selected,
    timezone,
  }: {
    item: TimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
    timezone?: string;
  }) => {
    if (item.type === "event") {
      return (
        <EventItem
          item={item}
          precision={precision}
          selected={selected}
          timezone={timezone}
        />
      );
    }
    return (
      <SessionItem
        item={item}
        precision={precision}
        selected={selected}
        timezone={timezone}
      />
    );
  },
);

function ItemBase({
  title,
  displayTime,
  calendarId,
  showSpinner,
  selected,
  ignored,
  onClick,
  onCmdClick,
  contextMenu,
}: {
  title: string;
  displayTime: string;
  calendarId: string | null;
  showSpinner?: boolean;
  selected: boolean;
  ignored?: boolean;
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
        "cursor-pointer w-full text-left px-3 py-2 rounded-lg",
        selected && "bg-neutral-200",
        !selected && "hover:bg-neutral-100",
        ignored && "opacity-40",
      ])}
    >
      <div className="flex items-center gap-2">
        {showSpinner && (
          <div className="shrink-0">
            <Spinner size={14} />
          </div>
        )}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div
            className={cn(
              "text-sm font-normal truncate",
              ignored && "line-through",
            )}
          >
            {title}
          </div>
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
    timezone,
  }: {
    item: EventTimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
    timezone?: string;
  }) => {
    const store = main.UI.useStore(main.STORE_ID);
    const indexes = main.UI.useIndexes(main.STORE_ID);
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);
    const invalidateResource = useTabs((state) => state.invalidateResource);

    const eventId = item.id;
    const title = item.data.title || "Untitled";
    const calendarId = item.data.calendar_id ?? null;
    const recurrenceSeriesId = item.data.recurrence_series_id;
    const ignored = !!item.data.ignored;
    const displayTime = useMemo(
      () => formatDisplayTime(item.data.started_at, precision, timezone),
      [item.data.started_at, precision, timezone],
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

    const handleIgnore = useCallback(() => {
      if (!store) {
        return;
      }
      store.setPartialRow("events", eventId, { ignored: true });
    }, [store, eventId, invalidateResource, indexes]);

    const handleUnignore = useCallback(() => {
      if (!store) {
        return;
      }
      store.setPartialRow("events", eventId, { ignored: false });
    }, [store, eventId]);

    const handleUnignoreSeries = useCallback(() => {
      if (!store || !recurrenceSeriesId) {
        return;
      }
      store.transaction(() => {
        store.forEachRow("events", (rowId, _forEachCell) => {
          const event = store.getRow("events", rowId);
          if (event?.recurrence_series_id === recurrenceSeriesId) {
            store.setPartialRow("events", rowId, { ignored: false });
          }
        });

        const currentIgnored = store.getValue("ignored_recurring_series");
        const ignoredList: string[] = currentIgnored
          ? JSON.parse(String(currentIgnored))
          : [];
        const filtered = ignoredList.filter((id) => id !== recurrenceSeriesId);
        store.setValue("ignored_recurring_series", JSON.stringify(filtered));
      });
    }, [store, recurrenceSeriesId]);

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
      if (ignored) {
        if (recurrenceSeriesId) {
          return [
            {
              id: "unignore",
              text: "Unignore Only This Event",
              action: handleUnignore,
            },
            {
              id: "unignore-series",
              text: "Unignore All Recurring Events",
              action: handleUnignoreSeries,
            },
          ];
        }
        return [
          { id: "unignore", text: "Unignore Event", action: handleUnignore },
        ];
      }
      const menu = [
        { id: "ignore", text: "Ignore Event", action: handleIgnore },
      ];
      if (recurrenceSeriesId) {
        menu.push({
          id: "ignore-series",
          text: "Ignore All Recurring Events",
          action: handleIgnoreSeries,
        });
      }
      return menu;
    }, [
      ignored,
      handleIgnore,
      handleUnignore,
      handleUnignoreSeries,
      handleIgnoreSeries,
      recurrenceSeriesId,
    ]);

    return (
      <ItemBase
        title={title}
        displayTime={displayTime}
        calendarId={calendarId}
        selected={selected}
        ignored={ignored}
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
    timezone,
  }: {
    item: SessionTimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
    timezone?: string;
  }) => {
    const store = main.UI.useStore(main.STORE_ID);
    const indexes = main.UI.useIndexes(main.STORE_ID);
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);
    const invalidateResource = useTabs((state) => state.invalidateResource);
    const addDeletion = useUndoDelete((state) => state.addDeletion);

    const sessionId = item.id;
    const title =
      (main.UI.useCell("sessions", sessionId, "title", main.STORE_ID) as
        | string
        | undefined) || "Untitled";

    const sessionMode = useListener((state) => state.getSessionMode(sessionId));
    const isEnhancing = useIsSessionEnhancing(sessionId);
    const isFinalizing = sessionMode === "finalizing";
    const showSpinner = !selected && (isFinalizing || isEnhancing);

    const calendarId =
      main.UI.useCell(
        "events",
        item.data.event_id ?? "",
        "calendar_id",
        store,
      ) ?? null;
    const eventStartedAt = main.UI.useCell(
      "events",
      item.data.event_id ?? "",
      "started_at",
      store,
    );
    const hasEvent = !!item.data.event_id;

    const displayTime = useMemo(
      () =>
        formatDisplayTime(
          eventStartedAt ?? item.data.created_at,
          precision,
          timezone,
        ),
      [eventStartedAt, item.data.created_at, precision, timezone],
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

      const capturedData = captureSessionData(store, indexes, sessionId);

      if (capturedData) {
        const performDelete = () => {
          invalidateResource("sessions", sessionId);
          void deleteSessionCascade(store, indexes, sessionId);
        };

        addDeletion(capturedData, performDelete);
      }
    }, [store, indexes, sessionId, invalidateResource, addDeletion]);

    const handleRevealInFinder = useCallback(async () => {
      await save();
      const result = await fsSyncCommands.sessionDir(sessionId);
      if (result.status === "ok") {
        await openerCommands.revealItemInDir(result.data);
      }
    }, [sessionId]);

    const contextMenu = useMemo(
      () => [
        {
          id: "open-new-tab",
          text: "Open in New Tab",
          action: handleCmdClick,
        },
        {
          id: "reveal",
          text: "Reveal in Finder",
          action: handleRevealInFinder,
        },
        {
          id: "delete",
          text: hasEvent ? "Delete Attached Note" : "Delete Note",
          action: handleDelete,
        },
      ],
      [handleCmdClick, handleRevealInFinder, handleDelete, hasEvent],
    );

    return (
      <DissolvingContainer sessionId={sessionId} variant="sidebar">
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
      </DissolvingContainer>
    );
  },
);

function formatDisplayTime(
  timestamp: string | null | undefined,
  precision: TimelinePrecision,
  timezone?: string,
): string {
  const parsed = safeParseDate(timestamp);
  if (!parsed) {
    return "";
  }

  const date = timezone ? new TZDate(parsed, timezone) : parsed;
  const time = format(date, "h:mm a");

  if (precision === "time") {
    return time;
  }

  const now = timezone ? new TZDate(new Date(), timezone) : new Date();
  const sameYear = getYear(date) === getYear(now);
  const dateStr = sameYear
    ? format(date, "MMM d")
    : format(date, "MMM d, yyyy");

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
