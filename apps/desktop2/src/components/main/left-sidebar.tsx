import { clsx } from "clsx";
import {
  Bell,
  Calendar,
  ChevronUpIcon,
  FolderOpen,
  PanelLeftCloseIcon,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useCell, useRowIds } from "tinybase/ui-react";

import * as persisted from "../../store/tinybase/persisted";

import { commands as windowsCommands } from "@hypr/plugin-windows";
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
      <UserSection />
    </div>
  );
}

function TimelineView() {
  const allSessionIds = useRowIds("sessions", persisted.STORE_ID);
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

function UserSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openNew } = useTabs();

  const handleClickSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
  }, []);

  const handleClickFolders = useCallback(() => {
    openNew({ type: "folders", id: null, active: true });
  }, [openNew]);

  const handleClickCalendar = useCallback(() => {
    openNew({ type: "calendars", month: new Date(), active: true });
  }, [openNew]);

  const handleClickNotifications = useCallback(() => {
    console.log("Notifications");
  }, []);

  const handleClickCheckUpdates = useCallback(() => {
    console.log("Check for updates");
  }, []);

  const handleClickContacts = useCallback(() => {
    console.log("Contacts");
  }, []);

  const menuItems = [
    { icon: Bell, label: "Notifications", badge: 10, onClick: handleClickNotifications },
    { icon: RefreshCw, label: "Check for updates", onClick: handleClickCheckUpdates },
    { icon: FolderOpen, label: "Folders", onClick: handleClickFolders },
    { icon: Users, label: "Contacts", onClick: handleClickContacts },
    { icon: Calendar, label: "Calendar", onClick: handleClickCalendar },
    { icon: Settings, label: "Settings", onClick: handleClickSettings },
  ];

  return (
    <div className="mt-auto border-t border-gray-200">
      <div
        className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="p-3 pb-0 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={item.onClick}
            >
              <item.icon className="h-4 w-4 text-gray-500" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        <div
          className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=JohnJeong"
              alt="Profile"
              className="h-full w-full rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">John Jeong</div>
          </div>
          <ChevronUpIcon
            className={clsx(
              "h-4 w-4 text-gray-500 flex-shrink-0 transition-transform duration-300",
              isExpanded && "rotate-180",
            )}
          />
        </div>
      </div>
    </div>
  );
}
