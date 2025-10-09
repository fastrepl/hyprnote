import { clsx } from "clsx";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import * as persisted from "../../../store/tinybase/persisted";
import { Tab, useTabs } from "../../../store/zustand/tabs";
import { InteractiveButton } from "../../interactive-button";

export function TimelineView() {
  const allSessionIds = persisted.UI.useRowIds("sessions", persisted.STORE_ID);
  const { currentTab } = useTabs();

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
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
  const title = persisted.UI.useCell("sessions", sessionId, "title", persisted.STORE_ID);
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
