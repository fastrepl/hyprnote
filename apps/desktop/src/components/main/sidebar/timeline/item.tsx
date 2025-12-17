import { memo, useCallback, useMemo } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { useListener } from "../../../../contexts/listener";
import { useIsSessionEnhancing } from "../../../../hooks/useEnhancedNotes";
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
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);
    const invalidateResource = useTabs((state) => state.invalidateResource);

    const store = main.UI.useStore(main.STORE_ID);

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
        const tab: TabInput = {
          id: existingSessionId,
          type: "sessions",
        };
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
    };

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
    }, [store, item.id, item.type, invalidateResource]);

    const contextMenu = (
      <>
        <ContextMenuItem
          className="cursor-pointer"
          onClick={() => handleCmdClick()}
        >
          Open in New Tab
        </ContextMenuItem>
        <ContextMenuItem
          className="cursor-pointer text-red-500 hover:bg-red-500 hover:text-white"
          onClick={handleDelete}
        >
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

      const time = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "numeric",
      });

      if (precision === "time") {
        return time;
      }

      const sameYear = date.getFullYear() === new Date().getFullYear();
      const dateStr = sameYear
        ? date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })
        : date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
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
        <div className="flex items-start gap-2">
          {showSpinner && (
            <div className="flex-shrink-0 mt-0.5">
              <Spinner size={14} />
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-sm font-normal truncate">{title}</div>
            {displayTime && (
              <div className="text-xs text-neutral-500">{displayTime}</div>
            )}
          </div>
        </div>
      </InteractiveButton>
    );
  },
);
