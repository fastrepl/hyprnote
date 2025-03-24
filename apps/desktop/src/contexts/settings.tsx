import { commands as windowsCommands } from "@hypr/plugin-windows";
import { createContext, useCallback, useContext } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SettingsContextType {
  open: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(
  null,
);

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const open = useCallback(() => {
    windowsCommands.windowShow("settings");
  }, []);

  useHotkeys(
    "mod+,",
    (event) => {
      event.preventDefault();
      open();
    },
    {
      splitKey: "!",
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <SettingsContext.Provider value={{ open }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
