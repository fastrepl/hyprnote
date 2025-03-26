import { createContext, useCallback, useContext, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export type RightPanelView = "chat" | "widget";

interface RightPanelContextType {
  isExpanded: boolean;
  currentView: RightPanelView;
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
  const [currentView, setCurrentView] = useState<RightPanelView>("chat");

  const hidePanel = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const switchView = useCallback((view: RightPanelView) => {
    setCurrentView(view);
  }, []);

  const togglePanel = useCallback((view?: RightPanelView) => {
    if (view && isExpanded && currentView !== view) {
      // If panel is expanded and we're switching to a different view
      setCurrentView(view);
    } else {
      // Otherwise toggle the expanded state
      setIsExpanded((prev) => !prev);
      // If a view is specified, set it
      if (view) {
        setCurrentView(view);
      }
    }
  }, [isExpanded, currentView]);

  // Handle cmd+r hotkey for widget panel
  useHotkeys(
    "mod+r",
    (event) => {
      event.preventDefault();
      if (isExpanded && currentView === "widget") {
        // If already expanded and in widget view, collapse
        setIsExpanded(false);
      } else if (isExpanded && currentView !== "widget") {
        // If expanded but in a different view, switch to widget view
        setCurrentView("widget");
      } else {
        // If collapsed, expand with widget view
        setIsExpanded(true);
        setCurrentView("widget");
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  // Handle cmd+j hotkey for chat panel
  useHotkeys(
    "mod+j",
    (event) => {
      event.preventDefault();
      if (isExpanded && currentView === "chat") {
        // If already expanded and in chat view, collapse
        setIsExpanded(false);
      } else if (isExpanded && currentView !== "chat") {
        // If expanded but in a different view, switch to chat view
        setCurrentView("chat");
      } else {
        // If collapsed, expand with chat view
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
    <RightPanelContext.Provider value={{ isExpanded, currentView, togglePanel, hidePanel, switchView }}>
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
