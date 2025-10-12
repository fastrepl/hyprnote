import { clsx } from "clsx";
import { Calendar, ChevronUpIcon, FileText, FolderOpen, Settings, Users } from "lucide-react";
import { useCallback, useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { useAutoCloser } from "../../../../hooks/useAutoCloser";
import { useTabs } from "../../../../store/zustand/tabs";
import { Trial } from "./banner";
import { NotificationsItem } from "./notification";
import { UpdateChecker } from "./ota";
import { MenuItem } from "./shared";

export function ProfileSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openNew } = useTabs();

  const closeMenu = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const profileRef = useAutoCloser(closeMenu, { esc: isExpanded, outside: isExpanded });

  const handleClickSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
    closeMenu();
  }, [closeMenu]);

  const handleClickFolders = useCallback(() => {
    openNew({ type: "folders", id: null, active: true });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickCalendar = useCallback(() => {
    openNew({ type: "calendars", month: new Date(), active: true });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickContacts = useCallback(() => {
    openNew({
      type: "contacts",
      active: true,
      state: {
        selectedOrganization: null,
        selectedPerson: null,
        editingPerson: null,
        editingOrg: null,
        showNewOrg: false,
        sortOption: "alphabetical",
      },
    });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickDailyNote = useCallback(() => {
    openNew({ type: "daily", date: new Date(), active: true });
    closeMenu();
  }, [openNew, closeMenu]);

  const menuItems = [
    { icon: FolderOpen, label: "Folders", onClick: handleClickFolders },
    { icon: Users, label: "Contacts", onClick: handleClickContacts },
    { icon: Calendar, label: "Calendar", onClick: handleClickCalendar },
    { icon: FileText, label: "Daily note", onClick: handleClickDailyNote },
    { icon: Settings, label: "Settings", onClick: handleClickSettings },
  ];

  return (
    <div ref={profileRef}>
      <div
        className={clsx(
          "bg-gray-50 rounded-lg overflow-hidden",
        )}
      >
        <div
          className={clsx(
            "grid transition-all duration-300 ease-in-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden py-1.5">
            <NotificationsItem />
            <UpdateChecker />

            <div className="my-1.5 border-t border-slate-100" />

            {menuItems.map((item) => <MenuItem key={item.label} {...item} />)}

            <div className="my-1.5 border-t border-slate-100" />

            <Trial />
          </div>
        </div>

        <ProfileButton isExpanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} />
      </div>
    </div>
  );
}

function ProfileButton({ isExpanded, onClick }: { isExpanded: boolean; onClick: () => void }) {
  return (
    <button
      className={clsx(
        "flex w-full items-center gap-2.5",
        "border-t border-slate-100",
        "px-4 py-2",
        "text-left",
        "transition-all duration-300",
        "hover:bg-gray-100",
        isExpanded && "bg-gray-100",
      )}
      onClick={onClick}
    >
      <div
        className={clsx(
          "hidden sm:flex  w-8 flex-shrink-0 items-center justify-center",
          "overflow-hidden rounded-full",
          "border border-white/60 border-t border-gray-400",
          "bg-gradient-to-br from-indigo-400 to-purple-500",
          "shadow-sm",
          "transition-transform duration-300",
        )}
      >
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=JohnJeong"
          alt="Profile"
          className={clsx("h-full w-full", "rounded-full")}
        />
      </div>
      <div className={clsx("min-w-0 flex-1")}>
        <div className={clsx("text-sm text-black", "truncate")}>John Jeong</div>
      </div>
      <div className={clsx("flex items-center gap-1.5")}>
        <span
          className={clsx(
            "hidden md:inline-block",
            "rounded-full",
            "border border-slate-900",
            "bg-white",
            "px-2.5 py-0.5",
            "text-[11px] font-medium text-slate-900",
          )}
        >
          Pro trial
        </span>
        <ChevronUpIcon
          className={clsx(
            "h-4 w-4",
            "transition-transform duration-300",
            isExpanded ? "rotate-180 text-slate-500" : "text-slate-400",
          )}
        />
      </div>
    </button>
  );
}
