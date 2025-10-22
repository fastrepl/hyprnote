import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";

import { clsx } from "clsx";
import { Calendar, ChevronUpIcon, FolderOpen, LogIn, LogOut, Settings, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useAutoCloser } from "../../../../hooks/useAutoCloser";
import { useTabs } from "../../../../store/zustand/tabs";
import { TryProBanner } from "./banner";
import { NotificationsMenuContent, NotificationsMenuHeader } from "./notification";
import { UpdateChecker } from "./ota";
import { MenuItem } from "./shared";

type ProfileView = "main" | "notifications";

export function ProfileSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<ProfileView>("main");
  const [mainViewHeight, setMainViewHeight] = useState<number | null>(null);
  const mainViewRef = useRef<HTMLDivElement | null>(null);
  const { openNew } = useTabs();

  // Mock auth state - toggle this to test different states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const closeMenu = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleDismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, []);

  const handleAuth = useCallback(() => {
    if (isAuthenticated) {
      // Mock logout
      console.log("Logging out...");
      setIsAuthenticated(false);
      setIsBannerDismissed(false);
    } else {
      // Mock sign in
      console.log("Signing in...");
      setIsAuthenticated(true);
    }
    closeMenu();
  }, [isAuthenticated, closeMenu]);

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

  useLayoutEffect(() => {
    if (!isExpanded || currentView !== "main") {
      return;
    }

    const element = mainViewRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        setMainViewHeight(height);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isExpanded, currentView, isBannerDismissed, isAuthenticated]);

  const profileRef = useAutoCloser(closeMenu, { esc: isExpanded, outside: isExpanded });

  const handleClickSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
    closeMenu();
  }, [closeMenu]);

  // TODO - why is this not working as intended
  const handleClickBilling = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "settings" }, { path: "/app/settings", search: { tab: "billing" } });
    });
    closeMenu();
  }, [closeMenu]);

  const handleClickFolders = useCallback(() => {
    openNew({ type: "folders", id: null });
    closeMenu();
  }, [openNew, closeMenu]);

  const handleClickCalendar = useCallback(() => {
    openNew({ type: "calendars", month: new Date() });
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

  const handleClickNotifications = useCallback(() => {
    setCurrentView("notifications");
  }, []);

  const handleBackToMain = useCallback(() => {
    setCurrentView("main");
  }, []);

  const menuItems = [
    { icon: FolderOpen, label: "Folders", onClick: handleClickFolders },
    { icon: Users, label: "Contacts", onClick: handleClickContacts },
    { icon: Calendar, label: "Calendar", onClick: handleClickCalendar },
    {
      icon: Settings,
      label: "Settings",
      onClick: handleClickSettings,
      badge: (
        <KbdGroup>
          <Kbd className="bg-neutral-200">⌘</Kbd>
          <Kbd className="bg-neutral-200">,</Kbd>
        </KbdGroup>
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
            <div className="bg-neutral-50 rounded-lg overflow-hidden shadow-lg border">
              <div className="pt-1.5">
                <AnimatePresence mode="wait">
                  {currentView === "main"
                    ? (
                      <motion.div
                        key="main"
                        initial={{ x: 0, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        ref={mainViewRef}
                      >
                        <NotificationsMenuHeader onClick={handleClickNotifications} />
                        <UpdateChecker />

                        <div className="my-1.5 border-t border-neutral-100" />

                        {menuItems.map((item) => <MenuItem key={item.label} {...item} />)}

                        {isAuthenticated
                          ? (
                            <div className="px-1 py-2">
                              <Button
                                onClick={handleAuth}
                                variant="outline"
                                className="w-full"
                              >
                                <LogOut className="w-4 h-4 mr-2" />
                                Log out
                              </Button>
                            </div>
                          )
                          : !isBannerDismissed
                          ? <TryProBanner isDismissed={false} onDismiss={handleDismissBanner} />
                          : (
                            <div className="px-1 py-2">
                              <Button
                                onClick={handleAuth}
                                variant="default"
                                className="w-full"
                              >
                                <LogIn className="w-4 h-4 mr-2" />
                                Sign in
                              </Button>
                            </div>
                          )}
                      </motion.div>
                    )
                    : (
                      <motion.div
                        key="notifications"
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={mainViewHeight ? { height: mainViewHeight } : undefined}
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

      <div className="bg-neutral-50 rounded-lg overflow-hidden">
        <ProfileButton
          isExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          onClickBilling={handleClickBilling}
        />
      </div>
    </div>
  );
}

function ProfileButton(
  { isExpanded, onClick, onClickBilling }: { isExpanded: boolean; onClick: () => void; onClickBilling: () => void },
) {
  return (
    <button
      className={clsx(
        "flex w-full items-center gap-2.5",
        "px-4 py-2",
        "text-left",
        "transition-all duration-300",
        "hover:bg-neutral-100",
        isExpanded && "bg-neutral-50 border-t border-neutral-100",
      )}
      onClick={onClick}
    >
      <div
        className={clsx(
          "flex size-8 flex-shrink-0 items-center justify-center",
          "overflow-hidden rounded-full",
          "border border-white/60 border-t border-neutral-400",
          "bg-gradient-to-br from-indigo-400 to-purple-500",
          "shadow-sm",
          "transition-transform duration-300",
        )}
      >
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=JohnJeong"
          alt="Profile"
          className="h-full w-full rounded-full"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-black truncate">John Jeong</div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          onClick={(e) => {
            e.stopPropagation();
            onClickBilling();
          }}
          className={clsx(
            "hidden md:inline-block",
            "rounded-full",
            "border border-neutral-900",
            "bg-white",
            "px-2.5 py-0.5",
            "text-[11px] font-medium text-neutral-900",
            "cursor-pointer",
            "hover:bg-neutral-100",
            "transition-colors duration-200",
          )}
        >
          Pro trial
        </span>
        <ChevronUpIcon
          className={clsx(
            "h-4 w-4",
            "transition-transform duration-300",
            isExpanded ? "rotate-180 text-neutral-500" : "text-neutral-400",
          )}
        />
      </div>
    </button>
  );
}
