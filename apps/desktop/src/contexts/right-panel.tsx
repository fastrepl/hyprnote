import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands as flagsCommands } from "@hypr/plugin-flags";

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
  const [currentView, setCurrentView] = useState<RightPanelView>("widget");
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const noteChatQuery = useQuery({
    queryKey: ["flags", "ChatRightPanel"],
    queryFn: () => flagsCommands.isEnabled("ChatRightPanel"),
  });

  const hidePanel = useCallback(() => {
    setIsExpanded(false);
    // Return focus to the previously focused element when hiding the panel
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
      // If panel is expanded and we're switching to a different view
      setCurrentView(view);

      // Focus chat input when switching to chat view
      if (view === "chat") {
        setTimeout(() => {
          const chatInput = document.querySelector(".right-panel-container textarea");
          if (chatInput) {
            (chatInput as HTMLTextAreaElement).focus();
          }
        }, 350); // Allow time for view change and animation
      }
    } else {
      // Store the active element before toggling
      if (!isExpanded) {
        // Save the currently focused element before expanding the panel
        previouslyFocusedElement.current = document.activeElement as HTMLElement;

        // Toggle the expanded state first
        setIsExpanded(true);

        // If expanding to chat view, focus the chat input after animation
        const targetView = view || currentView;
        if (targetView === "chat") {
          setTimeout(() => {
            const focusInput = () => {
              const chatInput = document.querySelector(".right-panel-container textarea");
              if (chatInput) {
                (chatInput as HTMLTextAreaElement).focus();
              } else {
                // If not found, try again after a short delay (panel might still be animating)
                setTimeout(focusInput, 50);
              }
            };
            focusInput();
          }, 350); // Increased delay to ensure panel is expanded
        }
      } else {
        // Toggle panel state first (collapse)
        setIsExpanded(false);

        // Return focus to the previously focused element when collapsing
        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 350); // Sync with animation duration
      }

      // If a view is specified, set it
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
        // If already expanded and in widget view, collapse
        setIsExpanded(false);
        // Return focus to the previously focused element
        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 0);
      } else if (isExpanded && currentView !== "widget") {
        // If expanded but in a different view, switch to widget view
        setCurrentView("widget");
      } else {
        // Store the active element before expanding
        previouslyFocusedElement.current = document.activeElement as HTMLElement;
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

  useHotkeys(
    "mod+j",
    (event) => {
      if (!noteChatQuery.data) {
        return;
      }

      event.preventDefault();

      if (isExpanded && currentView === "chat") {
        // If already expanded and in chat view, collapse
        setIsExpanded(false);
        // Return focus to the previously focused element
        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 0);
      } else if (isExpanded && currentView !== "chat") {
        // If expanded but in a different view, switch to chat view
        setCurrentView("chat");
      } else {
        // Store the active element before expanding
        previouslyFocusedElement.current = document.activeElement as HTMLElement;
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
