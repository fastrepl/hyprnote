import { ArrowUpRight, FileIcon } from "lucide-react";
import { useCallback } from "react";

import { Kbd, KbdGroup } from "@hypr/ui/components/ui/kbd";
import { cn } from "@hypr/utils";

import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { useNewNote } from "../../shared";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

export const TabItemEmpty: TabItem<Extract<Tab, { type: "empty" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<FileIcon className="w-4 h-4" />}
      title="New tab"
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

export function TabContentEmpty({
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "empty" }>;
}) {
  return (
    <StandardTabWrapper>
      <EmptyView />
    </StandardTabWrapper>
  );
}

function EmptyView() {
  const newNote = useNewNote({ behavior: "current" });
  const openCurrent = useTabs((state) => state.openCurrent);
  const openCalendar = useCallback(
    () => openCurrent({ type: "calendars", month: new Date() }),
    [openCurrent],
  );
  const openContacts = useCallback(
    () => openCurrent({ type: "contacts" }),
    [openCurrent],
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-neutral-600">
      <div className="flex flex-col gap-1 text-center min-w-[280px]">
        <ActionItem label="New Note" shortcut={["⌘", "N"]} onClick={newNote} />
        <ActionItem label="Open Calendar" onClick={openCalendar} />
        <ActionItem label="Open Contacts" onClick={openContacts} />
      </div>
    </div>
  );
}

function ActionItem({
  label,
  shortcut,
  onClick,
}: {
  label: string;
  shortcut?: string[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "flex items-center justify-between gap-8",
        "text-sm",
        "rounded-md px-4 py-2",
        "hover:bg-neutral-100 transition-colors cursor-pointer",
      ])}
    >
      <span>{label}</span>
      {shortcut && shortcut.length > 0 ? (
        <KbdGroup>
          {shortcut.map((key, index) => (
            <Kbd key={index} className="bg-neutral-200">
              {key}
            </Kbd>
          ))}
        </KbdGroup>
      ) : (
        <ArrowUpRight className="w-4 h-4 text-neutral-400" />
      )}
    </button>
  );
}
