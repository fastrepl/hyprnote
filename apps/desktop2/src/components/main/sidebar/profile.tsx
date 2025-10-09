import { clsx } from "clsx";
import { Bell, Calendar, ChevronUpIcon, FolderOpen, RefreshCw, Settings, Users } from "lucide-react";
import { useCallback, useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { useTabs } from "../../../store/zustand/tabs";

export function ProfileSection() {
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
