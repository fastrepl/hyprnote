import { createContext, useContext, useState, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SettingsPanelContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SettingsPanelContext = createContext<SettingsPanelContextType | null>(
  null,
);

export function SettingsPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useHotkeys(
    "mod+,",
    (event) => {
      event.preventDefault();
      toggle();
    },
    {
      splitKey: "!",
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <SettingsPanelContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SettingsPanelContext.Provider>
  );
}

export function useSettingsPanel() {
  const context = useContext(SettingsPanelContext);
  if (!context) {
    throw new Error(
      "useSettingsPanel must be used within SettingsPanelProvider",
    );
  }
  return context;
}
