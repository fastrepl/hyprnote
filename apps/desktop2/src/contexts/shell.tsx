import { createContext, useCallback, useContext, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface ShellContextType {
  isLeftSidebarExpanded: boolean;
  setIsLeftSidebarExpanded: (v: boolean) => void;
  toggleLeftSidebar: () => void;
  isRightPanelExpanded: boolean;
  setIsRightPanelExpanded: (v: boolean) => void;
  toggleRightPanel: () => void;
}

const ShellContext = createContext<ShellContextType | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(true);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(true);

  const toggleLeftSidebar = useCallback(() => {
    setIsLeftSidebarExpanded((prev) => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setIsRightPanelExpanded((prev) => !prev);
  }, []);

  useHotkeys(
    "mod+l",
    (event) => {
      event.preventDefault();
      toggleLeftSidebar();
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <ShellContext.Provider
      value={{
        isLeftSidebarExpanded,
        setIsLeftSidebarExpanded,
        toggleLeftSidebar,
        isRightPanelExpanded,
        setIsRightPanelExpanded,
        toggleRightPanel,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return context;
}
