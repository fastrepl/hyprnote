import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands as flagsCommands } from "@hypr/plugin-flags";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

export type RightPanelView = "chat" | "transcript";

export interface SelectionData {
  text: string;
  startOffset: number;
  endOffset: number;
  sessionId: string;
  timestamp: number;
}

interface RightPanelContextType {
  isExpanded: boolean;
  currentView: RightPanelView;
  setIsExpanded: (v: boolean) => void;
  togglePanel: (view?: RightPanelView) => void;
  hidePanel: () => void;
  switchView: (view: RightPanelView) => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  pendingSelection: SelectionData | null;
  sendSelectionToChat: (selectionData: SelectionData) => void;
  clearPendingSelection: () => void;
}

const RightPanelContext = createContext<RightPanelContextType | null>(null);

export function RightPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentView, setCurrentView] = useState<RightPanelView>("transcript");
  const [pendingSelection, setPendingSelection] = useState<SelectionData | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

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

  const togglePanel = useCallback(
    (view?: RightPanelView) => {
      if (view && isExpanded && currentView !== view) {
        setCurrentView(view);

        if (view === "chat") {
          setTimeout(() => {
            if (chatInputRef.current) {
              chatInputRef.current.focus();
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
                if (chatInputRef.current) {
                  chatInputRef.current.focus();
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
    },
    [isExpanded, currentView],
  );

  const sendSelectionToChat = useCallback((selectionData: SelectionData) => {
    setPendingSelection(selectionData);

    // Ensure chat panel is open (don't toggle if already open)
    if (!isExpanded) {
      // Panel is closed, open it with chat view
      setIsExpanded(true);
      setCurrentView("chat");

      setTimeout(() => {
        const focusInput = () => {
          if (chatInputRef.current) {
            chatInputRef.current.focus();
          } else {
            setTimeout(focusInput, 50);
          }
        };
        focusInput();
      }, 350);
    } else if (currentView !== "chat") {
      // Panel is open but showing wrong view, switch to chat
      setCurrentView("chat");

      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
      }, 350);
    } else {
      console.log("Panel already open with chat view, staying open");
    }
    // If panel is already open and showing chat, do nothing (don't close it)
  }, [isExpanded, currentView, chatInputRef]);

  const clearPendingSelection = useCallback(() => {
    setPendingSelection(null);
  }, []);

  const windowLabel = getCurrentWebviewWindowLabel();
  const isMainWindow = windowLabel === "main";

  const { data: chatPanelEnabled = false } = useQuery({
    queryKey: ["flags", "ChatRightPanel"],
    queryFn: () => flagsCommands.isEnabled("ChatRightPanel"),
    enabled: isMainWindow,
  });

  useHotkeys(
    "mod+r",
    (event) => {
      event.preventDefault();
      if (isExpanded && currentView === "transcript") {
        setIsExpanded(false);

        setTimeout(() => {
          if (previouslyFocusedElement.current) {
            previouslyFocusedElement.current.focus();
          }
        }, 0);
      } else if (isExpanded && currentView !== "transcript") {
        setCurrentView("transcript");
      } else {
        previouslyFocusedElement.current = document.activeElement as HTMLElement;

        setIsExpanded(true);
        setCurrentView("transcript");
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
      ignoreEventWhen: () => !chatPanelEnabled,
    },
  );

  return (
    <RightPanelContext.Provider
      value={{
        isExpanded,
        currentView,
        togglePanel,
        hidePanel,
        switchView,
        setIsExpanded,
        chatInputRef,
        pendingSelection,
        sendSelectionToChat,
        clearPendingSelection,
      }}
    >
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
