import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands as flagsCommands } from "@hypr/plugin-flags";

export type RightPanelView = "chat" | "widget";

interface RightPanelContextType {
  isExpanded: boolean;
  currentView: RightPanelView;
  setIsExpanded: (v: boolean) => void;
  togglePanel: (view?: RightPanelView) => void;
  hidePanel: () => void;
  switchView: (view: RightPanelView) => void;
}

const RightPanelContext = createContext<RightPanelContextType | null>(null);

export function RightPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<RightPanelView>("widget");
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const noteChatQuery = useQuery({
    queryKey: ["flags", "ChatRightPanel"],
    queryFn: () => flagsCommands.isEnabled("ChatRightPanel"),
  });

  const hidePanel = useCallback(() => {
    setIsExpanded(false);

    setTimeout(() => {
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    }, 0);
  }, []);

  const switchView = useCallback((view: RightPanelView) => {
    setCurrentView(view);
  }, []);

  const togglePanel = useCallback((view?: RightPanelView) => {
    if (view && isExpanded && currentView !== view) {
      setCurrentView(view);

      if (view === "chat") {
        setTimeout(() => {
          const chatInput = document.querySelector(".right-panel-container textarea");
          if (chatInput) {
            (chatInput as HTMLTextAreaElement).focus();
          }
        }, 350);
      }
    } else {
      if (!isExpanded) {
        previouslyFocusedElement.current = document.activeElement as HTMLElement;

        setIsExpanded(true);

        const targetView = view || currentView;
        if (targetView === "chat") {
          setTimeout(() => {
            const focusInput = () => {
              const chatInput = document.querySelector(".right-panel-container textarea");
              if (chatInput) {
                (chatInput as HTMLTextAreaElement).focus();
              } else {
                setTimeout(focusInput, 50);
              }
            };
            focusInput();
          }, 350);
        }
      } else {
        setIsExpanded(false);

        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 350);
      }

      if (view) {
        setCurrentView(view);
      }
    }
  }, [isExpanded, currentView]);

  useHotkeys(
    "mod+r",
    (event) => {
      event.preventDefault();
      if (isExpanded && currentView === "widget") {
        setIsExpanded(false);

        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 0);
      } else if (isExpanded && currentView !== "widget") {
        setCurrentView("widget");
      } else {
        previouslyFocusedElement.current = document.activeElement as HTMLElement;

        setIsExpanded(true);
        setCurrentView("widget");
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  useHotkeys(
    "mod+j",
    (event) => {
      if (!noteChatQuery.data) {
        return;
      }

      event.preventDefault();

      if (isExpanded && currentView === "chat") {
        setIsExpanded(false);

        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 0);
      } else if (isExpanded && currentView !== "chat") {
        setCurrentView("chat");
      } else {
        previouslyFocusedElement.current = document.activeElement as HTMLElement;

        setIsExpanded(true);
        setCurrentView("chat");
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <RightPanelContext.Provider value={{ isExpanded, currentView, togglePanel, hidePanel, switchView, setIsExpanded }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const context = useContext(RightPanelContext);
  if (!context) {
    throw new Error("useRightPanel must be used within RightPanelProvider");
  }
  return context;
}
