import { createContext, useCallback, useContext, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useChatMode } from "./chat";

interface ShellContextType {
  leftsidebar: {
    expanded: boolean;
    setExpanded: (v: boolean) => void;
    toggleExpanded: () => void;
  };
  chat: ReturnType<typeof useChatMode>;
}

const ShellContext = createContext<ShellContextType | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(true);
  const chat = useChatMode();

  const toggleLeftSidebar = useCallback(() => {
    setIsLeftSidebarExpanded((prev) => !prev);
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
        leftsidebar: {
          expanded: isLeftSidebarExpanded,
          setExpanded: setIsLeftSidebarExpanded,
          toggleExpanded: toggleLeftSidebar,
        },
        chat,
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

export type { ChatEvent, ChatMode } from "./chat";
