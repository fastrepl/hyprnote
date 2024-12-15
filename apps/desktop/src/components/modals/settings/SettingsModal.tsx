import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { General } from "./tabs/General";
import { Feedback } from "./tabs/Feedback";
import { Billing } from "./tabs/Billing";
import { Calendars } from "./tabs/Calendars";
import { Notifications } from "./tabs/Notifications";
import { Integrations } from "./tabs/Integrations";
import { Profile } from "./tabs/Profile";
import { SettingsTabs } from "./SettingsTabs";

export default function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleSettingsTrigger = () => {
      setIsOpen(true);
    };

    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("openSettings", handleSettingsTrigger);
    window.addEventListener("keydown", handleKeyboardShortcut);

    return () => {
      window.removeEventListener("openSettings", handleSettingsTrigger);
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, []);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-xl">
          <Tabs.Root defaultValue="profile" className="flex h-full">
            <div className="w-48 border-r border-gray-200 bg-gray-50 p-2">
              <SettingsTabs />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs.Content value="profile">
                <Profile />
              </Tabs.Content>
              <Tabs.Content value="general">
                <General />
              </Tabs.Content>
              <Tabs.Content value="feedback">
                <Feedback />
              </Tabs.Content>
              <Tabs.Content value="billing">
                <Billing />
              </Tabs.Content>
              <Tabs.Content value="calendar">
                <Calendars />
              </Tabs.Content>
              <Tabs.Content value="notification">
                <Notifications />
              </Tabs.Content>
              <Tabs.Content value="integrations">
                <Integrations />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
