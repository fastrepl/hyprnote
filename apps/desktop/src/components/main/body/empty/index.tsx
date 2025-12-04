import { ArrowUpRight, ChevronDown, FileIcon } from "lucide-react";
import { useCallback, useState } from "react";

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
  const [showOthers, setShowOthers] = useState(false);
  const newNote = useNewNote({ behavior: "current" });
  const openCurrent = useTabs((state) => state.openCurrent);
  const openCalendar = useCallback(
    () => openCurrent({ type: "extension", extensionId: "calendar" }),
    [openCurrent],
  );
  const openContacts = useCallback(
    () => openCurrent({ type: "contacts" }),
    [openCurrent],
  );
  const openTemplates = useCallback(
    () => openCurrent({ type: "templates" }),
    [openCurrent],
  );
  const openShortcuts = useCallback(
    () => openCurrent({ type: "chat_shortcuts" }),
    [openCurrent],
  );
  const openPrompts = useCallback(
    () => openCurrent({ type: "prompts" }),
    [openCurrent],
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 mb-12 text-neutral-600">
      <div className="relative flex flex-col gap-1 text-center min-w-[280px]">
        <ActionItem label="New Note" shortcut={["⌘", "N"]} onClick={newNote} />
        <ActionItem
          label="Others"
          icon={
            <ChevronDown
              className={cn([
                "w-4 h-4 text-neutral-400 transition-transform",
                showOthers && "rotate-180",
              ])}
            />
          }
          onClick={() => setShowOthers(!showOthers)}
        />
        {showOthers && (
          <div className="absolute top-full left-0 right-0 flex flex-col gap-1 pt-1">
            <ActionItem label="Open Calendar" onClick={openCalendar} />
            <ActionItem label="Open Contacts" onClick={openContacts} />
            <ActionItem label="Open Templates" onClick={openTemplates} />
            <ActionItem label="Open Shortcuts" onClick={openShortcuts} />
            <ActionItem label="Open Prompts" onClick={openPrompts} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionItem({
  label,
  shortcut,
  icon,
  onClick,
}: {
  label: string;
  shortcut?: string[];
  icon?: React.ReactNode;
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
      ) : icon ? (
        icon
      ) : (
        <ArrowUpRight className="w-4 h-4 text-neutral-400" />
      )}
    </button>
  );
}
