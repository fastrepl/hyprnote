import { memo, useCallback, useMemo } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn, safeParseDate } from "@hypr/utils";

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
        "cursor-pointer w-full text-left px-3 py-2 rounded-lg",
        selected && "bg-neutral-200",
        !selected && "hover:bg-neutral-100",
      ])}
    >
      <div className="flex items-center gap-2">
        {showSpinner && (
          <div className="shrink-0">
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
    const { setDeletedSession, setTimeoutId } = useUndoDelete();

    const eventId = item.id;

    const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
    const attachedSessionId = useMemo(() => {
      if (!store) {
        return undefined;
      }
      let sessionId: string | undefined;
      store.forEachRow("sessions", (rowId, _forEachCell) => {
        const session = store.getRow("sessions", rowId);
        if (session?.event_id === eventId) {
          sessionId = rowId;
        }
      });
      return sessionId;
    }, [store, eventId, sessionIds]);

    const attachedNoteIds = main.UI.useSliceRowIds(
      main.INDEXES.enhancedNotesBySession,
      attachedSessionId ?? "",
      main.STORE_ID,
    );
    const rawMd = main.UI.useCell(
      "sessions",
      attachedSessionId ?? "",
      "raw_md",
      main.STORE_ID,
    );
    const hasRawContent = typeof rawMd === "string" && rawMd.trim().length > 0;
    const hasNote =
      attachedSessionId && (attachedNoteIds.length > 0 || hasRawContent);

    const sessionTitle = main.UI.useCell(
      "sessions",
      attachedSessionId ?? "",
      "title",
      main.STORE_ID,
    ) as string | undefined;
    const title = attachedSessionId
      ? sessionTitle || "Untitled"
      : item.data.title || "Untitled";

    const calendarId = item.data.calendar_id ?? null;
    const recurrenceSeriesId = item.data.recurrence_series_id;
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
      if (attachedSessionId && !hasNote) {
        invalidateResource("sessions", attachedSessionId);
        void deleteSessionCascade(store, indexes, attachedSessionId);
      }
    }, [
      store,
      eventId,
      attachedSessionId,
      hasNote,
      invalidateResource,
      indexes,
    ]);

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

    const handleDelete = useCallback(() => {
      if (!store || !attachedSessionId) {
        return;
      }

      const capturedData = captureSessionData(
        store,
        indexes,
        attachedSessionId,
      );

      if (capturedData) {
        const performDelete = () => {
          store.setPartialRow("events", eventId, { ignored: true });
          invalidateResource("sessions", attachedSessionId);
          void deleteSessionCascade(store, indexes, attachedSessionId);
        };

        setDeletedSession(capturedData, performDelete);
        const timeoutId = setTimeout(() => {
          useUndoDelete.getState().confirmDelete();
        }, 5000);
        setTimeoutId(timeoutId);
      }
    }, [
      store,
      indexes,
      attachedSessionId,
      invalidateResource,
      eventId,
      setDeletedSession,
      setTimeoutId,
    ]);

    const handleRevealInFinder = useCallback(async () => {
      if (!attachedSessionId) {
        return;
      }
      await save();
      const result = await fsSyncCommands.sessionDir(attachedSessionId);
      if (result.status === "ok") {
        await openerCommands.revealItemInDir(result.data);
      }
    }, [attachedSessionId]);

    const contextMenu = useMemo(() => {
      if (hasNote) {
        return [
          {
            id: "open-new-tab",
            text: "Open in new tab",
            action: handleCmdClick,
          },
          {
            id: "reveal",
            text: "Reveal in Finder",
            action: handleRevealInFinder,
          },
          { id: "delete", text: "Delete completely", action: handleDelete },
        ];
      }

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
    }, [
      hasNote,
      handleCmdClick,
      handleRevealInFinder,
      handleDelete,
      handleIgnore,
      handleIgnoreSeries,
      recurrenceSeriesId,
    ]);

    const content = (
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

    if (attachedSessionId) {
      return (
        <DissolvingContainer sessionId={attachedSessionId} variant="sidebar">
          {content}
        </DissolvingContainer>
      );
    }

    return content;
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
    const { setDeletedSession, setTimeoutId } = useUndoDelete();

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

        setDeletedSession(capturedData, performDelete);
        const timeoutId = setTimeout(() => {
          useUndoDelete.getState().confirmDelete();
        }, 5000);
        setTimeoutId(timeoutId);
      }
    }, [
      store,
      indexes,
      sessionId,
      invalidateResource,
      setDeletedSession,
      setTimeoutId,
    ]);

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
          text: "Open in new tab",
          action: handleCmdClick,
        },
        {
          id: "reveal",
          text: "Reveal in Finder",
          action: handleRevealInFinder,
        },
        { id: "delete", text: "Delete completely", action: handleDelete },
      ],
      [handleCmdClick, handleRevealInFinder, handleDelete],
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
  const date = safeParseDate(timestamp);
  if (!date) {
    return "";
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    timeZone: timezone,
  };

  const time = date.toLocaleTimeString([], timeOptions);

  if (precision === "time") {
    return time;
  }

  const now = new Date();
  const yearInTz = timezone
    ? parseInt(
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          timeZone: timezone,
        }).format(date),
      )
    : date.getFullYear();
  const currentYearInTz = timezone
    ? parseInt(
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          timeZone: timezone,
        }).format(now),
      )
    : now.getFullYear();
  const sameYear = yearInTz === currentYearInTz;

  const dateOptions: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric", timeZone: timezone }
    : { month: "short", day: "numeric", year: "numeric", timeZone: timezone };

  const dateStr = date.toLocaleDateString([], dateOptions);

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
