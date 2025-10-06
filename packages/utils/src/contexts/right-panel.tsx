import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export interface SelectionData {
  text: string;
  startOffset: number;
  endOffset: number;
  sessionId: string;
  timestamp: number;
}

interface RightPanelContextType {
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  togglePanel: () => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
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
  const [pendingSelection, setPendingSelection] = useState<SelectionData | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const togglePanel = useCallback(() => {
    if (!isExpanded) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      setIsExpanded(true);

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
    } else {
      setIsExpanded(false);

      setTimeout(() => {
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      }, 0);
    }
  }, [isExpanded]);

  const sendSelectionToChat = useCallback((selectionData: SelectionData) => {
    setPendingSelection(selectionData);

    if (!isExpanded) {
      setIsExpanded(true);

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
  }, [isExpanded, chatInputRef]);

  const clearPendingSelection = useCallback(() => {
    setPendingSelection(null);
  }, []);

  useHotkeys(
    "mod+j",
    (event) => {
      event.preventDefault();
      togglePanel();
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <RightPanelContext.Provider
      value={{
        isExpanded,
        togglePanel,
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
