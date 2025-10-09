import { clsx } from "clsx";
import { PanelLeftCloseIcon } from "lucide-react";
import { useCell, useRowIds } from "tinybase/ui-react";

import * as persisted from "../../store/tinybase/persisted";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { useTabs } from "../../store/zustand/tabs";
import { type Tab } from "../../store/zustand/tabs";
import { InteractiveButton } from "../interactive-button";

export function LeftSidebar() {
  const { togglePanel: toggleLeftPanel } = useLeftSidebar();

  return (
    <div className="h-full border-r w-full flex flex-col overflow-hidden">
      <header
        data-tauri-drag-region
        className={clsx([
          "flex flex-row shrink-0",
          "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
          "border-border bg-neutral-50",
          "pl-[72px]",
        ])}
      >
        <PanelLeftCloseIcon
          onClick={toggleLeftPanel}
          className="cursor-pointer h-5 w-5"
        />
      </header>

      <TimelineView />
    </div>
  );
}

function TimelineView() {
  const allSessionIds = useRowIds("sessions", persisted.STORE_ID);
  const { currentTab } = useTabs();

  return (
    <div className="flex flex-col">
      {allSessionIds?.map((sessionId) => (
        <SessionItem
          key={sessionId}
          sessionId={sessionId}
          active={currentTab?.type === "sessions" && currentTab?.id === sessionId}
        />
      ))}
    </div>
  );
}

function SessionItem({ sessionId, active }: { sessionId: string; active?: boolean }) {
  const title = useCell("sessions", sessionId, "title", persisted.STORE_ID);
  const tab: Tab = { id: sessionId, type: "sessions", active: false };

  const { openCurrent, openNew } = useTabs();

  const contextMenu = (
    <>
      <ContextMenuItem onClick={() => console.log("Delete session:", sessionId)}>
        Delete
      </ContextMenuItem>
    </>
  );

  return (
    <InteractiveButton
      onClick={() => openCurrent(tab)}
      onCmdClick={() => openNew(tab)}
      contextMenu={contextMenu}
      className={clsx([
        "w-full text-left px-2 py-1 hover:bg-blue-50 border-b border-gray-100",
        active && "bg-blue-50",
      ])}
    >
      <div className="text-sm font-medium truncate">{title}</div>
    </InteractiveButton>
  );
}
