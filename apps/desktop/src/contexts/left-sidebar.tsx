import { createContext, useContext, useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface LeftSidebarContextType {
  isExpanded: boolean;
  togglePanel: () => void;
}

const LeftSidebarContext = createContext<LeftSidebarContextType | null>(null);

export function LeftSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const togglePanel = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  useHotkeys(
    "mod+l",
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
    <LeftSidebarContext.Provider value={{ isExpanded, togglePanel }}>
      {children}
    </LeftSidebarContext.Provider>
  );
}

export function useLeftSidebar() {
  const context = useContext(LeftSidebarContext);
  if (!context) {
    throw new Error("useLeftSidebar must be used within LeftSidebarProvider");
  }
  return context;
}
