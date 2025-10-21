import { createContext, useContext } from "react";

import { useChatMode } from "./chat";
import { useLeftSidebar } from "./leftsidebar";
import { useSearchShortcut } from "./search";
import { useSettings } from "./settings";
import { useTabsShortcuts } from "./tabs";

interface ShellContextType {
  chat: ReturnType<typeof useChatMode>;
  leftsidebar: ReturnType<typeof useLeftSidebar>;
  search: ReturnType<typeof useSearchShortcut>;
  settings: ReturnType<typeof useSettings>;
  tabs: ReturnType<typeof useTabsShortcuts>;
}

const ShellContext = createContext<ShellContextType | null>(null);

interface ShellProviderProps {
  children: React.ReactNode;
  onNewTab: (closeCurrentFirst: boolean) => void;
  onFocusSearch: () => void;
}

export function ShellProvider({ children, onNewTab, onFocusSearch }: ShellProviderProps) {
  const chat = useChatMode();
  const leftsidebar = useLeftSidebar();
  const search = useSearchShortcut({ onFocusSearch });
  const settings = useSettings();
  const tabs = useTabsShortcuts(onNewTab);

  return (
    <ShellContext.Provider value={{ chat, leftsidebar, search, settings, tabs }}>
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
