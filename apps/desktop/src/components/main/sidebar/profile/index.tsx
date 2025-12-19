import { useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  ChevronUpIcon,
  FolderOpenIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useResizeObserver } from "usehooks-ts";

import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";
import { useAutoCloser } from "../../../../hooks/useAutoCloser";
import * as main from "../../../../store/tinybase/main";
import { useTabs } from "../../../../store/zustand/tabs";
import { AuthSection } from "./auth";
import { NotificationsMenuContent } from "./notification";
import { UpdateChecker } from "./ota";
import { MenuItem } from "./shared";

type ProfileView = "main" | "notifications";

type ProfileSectionProps = {
  onExpandChange?: (expanded: boolean) => void;
};

export function ProfileSection({ onExpandChange }: ProfileSectionProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<ProfileView>("main");
  const [mainViewHeight, setMainViewHeight] = useState<number | null>(null);
  const mainViewRef = useRef<HTMLDivElement | null>(null);
  const openNew = useTabs((state) => state.openNew);
  const auth = useAuth();

  const isAuthenticated = !!auth?.session;

  const closeMenu = useCallback(() => {
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    if (!isExpanded && currentView !== "main") {
      const timer = setTimeout(() => {
        setCurrentView("main");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, currentView]);

  useEffect(() => {
    if (!isExpanded) {
      setMainViewHeight(null);
    }
  }, [isExpanded]);

  const handleMainViewResize = useCallback(
    ({ height }: { width?: number; height?: number }) => {
      if (!isExpanded || currentView !== "main") {
        return;
      }
      if (height && height > 0) {
        setMainViewHeight(height);
      }
    },
    [isExpanded, currentView],
  );

  useResizeObserver({
    ref: mainViewRef as React.RefObject<HTMLDivElement>,
    onResize: handleMainViewResize,
  });

  const profileRef = useAutoCloser(closeMenu, {
    esc: isExpanded,
    outside: isExpanded,
  });

  const handleClickSettings = useCallback(() => {
    openNew({ type: "settings" });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickFolders = useCallback(() => {
    openNew({ type: "folders", id: null });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickCalendar = useCallback(() => {
    openNew({ type: "calendar" });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickContacts = useCallback(() => {
    openNew({
      type: "contacts",
      state: {
        selectedOrganization: null,
        selectedPerson: null,
      },
    });
    closeMenu();
  }, [openNew, closeMenu]);

  // const handleClickNotifications = useCallback(() => {
  //   setCurrentView("notifications");
  // }, []);

  const handleBackToMain = useCallback(() => {
    setCurrentView("main");
  }, []);

  const handleClickProfile = useCallback(() => {
    // TODO: Show the user's own profile in the contacts view
    openNew({
      type: "contacts",
      state: {
        selectedOrganization: null,
        selectedPerson: null,
      },
    });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickAI = useCallback(() => {
    openNew({ type: "ai" });
    closeMenu();
  }, [openNew, closeMenu]);

  // const handleClickData = useCallback(() => {
  //   openNew({ type: "data" });
  //   closeMenu();
  // }, [openNew, closeMenu]);

  const kbdClass = cn([
    "inline-flex h-5 items-center gap-1",
    "rounded border border-neutral-300",
    "bg-gradient-to-b from-white to-neutral-100",
    "px-1.5 font-mono text-[10px] font-medium text-neutral-400",
    "shadow-[0_1px_0_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
    "select-none transition-all duration-100",
    "group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
    "group-active:translate-y-0.5 group-active:shadow-none",
  ]);

  const menuItems = [
    {
      icon: FolderOpenIcon,
      label: "Folders",
      onClick: handleClickFolders,
      badge: (
        <kbd className={kbdClass}>
          <span className="text-xs">⌘</span>
          <span className="text-xs">⇧</span>D
        </kbd>
      ),
    },
    {
      icon: UsersIcon,
      label: "Contacts",
      onClick: handleClickContacts,
      badge: (
        <kbd className={kbdClass}>
          <span className="text-xs">⌘</span>
          <span className="text-xs">⇧</span>O
        </kbd>
      ),
    },
    {
      icon: CalendarIcon,
      label: "Calendar",
      onClick: handleClickCalendar,
      badge: (
        <kbd className={kbdClass}>
          <span className="text-xs">⌘</span>
          <span className="text-xs">⇧</span>C
        </kbd>
      ),
    },
    {
      icon: SparklesIcon,
      label: "AI",
      onClick: handleClickAI,
      badge: (
        <kbd className={kbdClass}>
          <span className="text-xs">⌘</span>
          <span className="text-xs">⇧</span>A
        </kbd>
      ),
    },
    // { icon: DatabaseIcon, label: "Data", onClick: handleClickData },
    {
      icon: UserIcon,
      label: "My Profile",
      onClick: handleClickProfile,
      badge: (
        <kbd className={kbdClass}>
          <span className="text-xs">⌘</span>
          <span className="text-xs">⇧</span>M
        </kbd>
      ),
    },
    {
      icon: SettingsIcon,
      label: "Settings",
      onClick: handleClickSettings,
      badge: (
        <kbd className={kbdClass}>
          <span className="text-xs">⌘</span>,
        </kbd>
      ),
    },
  ];

  return (
    <div ref={profileRef} className="relative">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute bottom-full left-0 right-0 mb-1"
          >
            <div className="bg-neutral-50 rounded-xl overflow-hidden shadow-sm border">
              <div className="pt-1">
                <AnimatePresence mode="wait">
                  {currentView === "main" ? (
                    <motion.div
                      key="main"
                      initial={{ x: 0, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 0, opacity: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: "easeInOut",
                      }}
                      ref={mainViewRef}
                    >
                      {/*<NotificationsMenuHeader
                        onClick={handleClickNotifications}
                      />*/}
                      <UpdateChecker />

                      <div className="my-1 border-t border-neutral-100" />

                      {menuItems.map((item) => (
                        <MenuItem key={item.label} {...item} />
                      ))}

                      <AuthSection isAuthenticated={isAuthenticated} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="notifications"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: "easeInOut",
                      }}
                      style={
                        mainViewHeight ? { height: mainViewHeight } : undefined
                      }
                    >
                      <NotificationsMenuContent onBack={handleBackToMain} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-neutral-50 rounded-xl overflow-hidden">
        <ProfileButton
          isExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
        />
      </div>
    </div>
  );
}

function ProfileButton({
  isExpanded,
  onClick,
}: {
  isExpanded: boolean;
  onClick: () => void;
}) {
  const auth = useAuth();
  const name = useMyName(auth?.session?.user.email);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const avatarUrl = await auth?.getAvatarUrl();
      return avatarUrl;
    },
  });

  return (
    <button
      className={cn([
        "flex w-full items-center gap-2.5",
        "px-4 py-2",
        "text-left",
        "transition-all duration-300",
        "hover:bg-neutral-100",
        isExpanded && "bg-neutral-50 border-t border-neutral-100",
      ])}
      onClick={onClick}
    >
      <div
        className={cn([
          "flex size-8 flex-shrink-0 items-center justify-center",
          "overflow-hidden rounded-full",
          "border border-white/60 border-t border-neutral-400",
          "bg-gradient-to-br from-indigo-400 to-purple-500",
          "shadow-sm",
          "transition-transform duration-300",
        ])}
      >
        {profile.data && (
          <img
            src={profile.data}
            alt="Profile"
            className="h-full w-full rounded-full"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-black truncate">{name}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <ChevronUpIcon
          className={cn([
            "h-4 w-4",
            "transition-transform duration-300",
            isExpanded ? "rotate-180 text-neutral-500" : "text-neutral-400",
          ])}
        />
      </div>
    </button>
  );
}

function useMyName(email?: string) {
  const userId = main.UI.useValue("user_id", main.STORE_ID);
  const name = main.UI.useCell("humans", userId ?? "", "name", main.STORE_ID);
  return name || email || "Unknown";
}
