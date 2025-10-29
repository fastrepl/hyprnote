import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";

import { useCallback, useMemo } from "react";

import * as persisted from "../../../../store/tinybase/persisted";
import { type TabInput, useTabs } from "../../../../store/zustand/tabs";
import { id } from "../../../../utils";
import { type TimelineItem, TimelinePrecision } from "../../../../utils/timeline";
import { InteractiveButton } from "../../../interactive-button";

export function TimelineItemComponent({ item, precision }: { item: TimelineItem; precision: TimelinePrecision }) {
  const { currentTab, openCurrent, openNew, invalidateResource } = useTabs();
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const title = item.data.title || "Untitled";
  const timestamp = item.type === "event" ? item.data.started_at : item.data.created_at;
  const eventId = item.type === "event" ? item.id : (item.data.event_id || undefined);

  const handleClick = () => {
    if (item.type === "event") {
      handleEventClick(false);
    } else {
      const tab: TabInput = { id: item.id, type: "sessions" };
      openCurrent(tab);
    }
  };

  const handleCmdClick = () => {
    if (item.type === "event") {
      handleEventClick(true);
    } else {
      const tab: TabInput = { id: item.id, type: "sessions" };
      openNew(tab);
    }
  };

  const handleEventClick = (openInNewTab: boolean) => {
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
      const tab: TabInput = { id: sessionId, type: "sessions" };
      if (openInNewTab) {
        openNew(tab);
      } else {
        openCurrent(tab);
      }
    }
  };

  const selected = currentTab?.type === "sessions" && (
    (item.type === "session" && currentTab.id === item.id)
    || (item.type === "event" && item.id === eventId && (() => {
      if (!store) {
        return false;
      }
      const session = store.getRow("sessions", currentTab.id);
      return session?.event_id === eventId;
    })())
  );

  const handleDelete = useCallback(() => {
    if (!store) {
      return;
    }
    if (item.type === "event") {
      invalidateResource("events", item.id);
      store.delRow("events", item.id);
    } else {
      invalidateResource("sessions", item.id);
      store.delRow("sessions", item.id);
    }
  }, [store, item.id, invalidateResource]);

  const contextMenu = (
    <>
      <ContextMenuItem className="cursor-pointer" onClick={() => handleCmdClick()}>
        Open in New Tab
      </ContextMenuItem>
      <ContextMenuItem className="cursor-pointer text-red-500 hover:bg-red-500 hover:text-white" onClick={handleDelete}>
        Delete Completely
      </ContextMenuItem>
    </>
  );
  const displayTime = useMemo(() => {
    if (!timestamp) {
      return "";
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "numeric" });

    if (precision === "time") {
      return time;
    }

    const sameYear = date.getFullYear() === new Date().getFullYear();
    const dateStr = sameYear
      ? date.toLocaleDateString([], { month: "short", day: "numeric" })
      : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    return `${dateStr}, ${time}`;
  }, [timestamp, precision]);

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
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-normal truncate">{title}</div>
        {displayTime && <div className="text-xs text-neutral-500">{displayTime}</div>}
      </div>
    </InteractiveButton>
  );
}
