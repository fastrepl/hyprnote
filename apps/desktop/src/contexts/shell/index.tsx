import { createContext, useContext } from "react";

import { useChatMode } from "./chat";
import { useLeftSidebar } from "./leftsidebar";
import { useSettings } from "./settings";
import { useTabsShortcuts } from "./tabs";

interface ShellContextType {
  chat: ReturnType<typeof useChatMode>;
  leftsidebar: ReturnType<typeof useLeftSidebar>;
  settings: ReturnType<typeof useSettings>;
  tabs: ReturnType<typeof useTabsShortcuts>;
}

const ShellContext = createContext<ShellContextType | null>(null);

interface ShellProviderProps {
  children: React.ReactNode;
  onNewTab: (closeCurrentFirst: boolean) => void;
}

export function ShellProvider({ children, onNewTab }: ShellProviderProps) {
  const chat = useChatMode();
  const leftsidebar = useLeftSidebar();
  const settings = useSettings();
  const tabs = useTabsShortcuts(onNewTab);

  return (
    <ShellContext.Provider value={{ chat, leftsidebar, settings, tabs }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("'useShell' must be used within 'ShellProvider'");
  }
  return context;
}
