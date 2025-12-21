import { AppWindowIcon, ArrowUpRight, ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";

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
      icon={<AppWindowIcon className="w-4 h-4" />}
      title="New tab"
      selected={tab.active}
      isEmptyTab
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
          label="Calendar"
          shortcut={["⌘", "⇧", "C"]}
          onClick={openCalendar}
        />
        <ActionItem
          label="Contacts"
          shortcut={["⌘", "⇧", "O"]}
          onClick={openContacts}
        />
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
            <ActionItem label="Templates" onClick={openTemplates} />
            <ActionItem label="Shortcuts" onClick={openShortcuts} />
            <ActionItem label="Prompts" onClick={openPrompts} />
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
        "group",
        "flex items-center justify-between gap-8",
        "text-sm",
        "rounded-md px-4 py-2",
        "hover:bg-neutral-100 transition-colors cursor-pointer",
      ])}
    >
      <span>{label}</span>
      {shortcut && shortcut.length > 0 ? (
        <kbd
          className={cn([
            "inline-flex h-5 items-center gap-1",
            "rounded border border-neutral-300",
            "bg-gradient-to-b from-white to-neutral-100",
            "px-1.5 font-mono text-xs font-medium text-neutral-400",
            "shadow-[0_1px_0_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
            "select-none transition-all duration-100",
            "group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.8)]",
            "group-active:translate-y-0.5 group-active:shadow-none",
          ])}
        >
          {shortcut.map((key, index) => (
            <span key={index}>{key}</span>
          ))}
        </kbd>
      ) : icon ? (
        icon
      ) : (
        <ArrowUpRight className="w-4 h-4 text-neutral-400" />
      )}
    </button>
  );
}
