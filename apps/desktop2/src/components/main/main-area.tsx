import { useNavigate, useSearch } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Building2Icon,
  CalendarIcon,
  CogIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  StickyNoteIcon,
  UserIcon,
} from "lucide-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import NoteEditor from "@hypr/tiptap/editor";
import { ChatPanelButton } from "@hypr/ui/components/block/chat-panel-button";
import TitleInput from "@hypr/ui/components/block/title-input";
import { ScrollArea, ScrollBar } from "@hypr/ui/components/ui/scroll-area";
import { useLeftSidebar, useRightPanel } from "@hypr/utils/contexts";
import { useTabs } from "../../hooks/useTabs";
import * as persisted from "../../tinybase/store/persisted";
import { Tab } from "../../types";
import { id } from "../../utils";

export function MainContent({ tabs }: { tabs: Tab[] }) {
  const activeTab = tabs.find((t) => t.active)!;

  return (
    <div className="flex flex-col">
      <TabsHeader tabs={tabs} />
      <TabContent tab={activeTab} />
    </div>
  );
}

export function MainHeader() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const { openNew } = useTabs();
  const { isExpanded: isRightPanelExpanded, togglePanel: toggleRightPanel } = useRightPanel();
  const { isExpanded: isLeftPanelExpanded, togglePanel: toggleLeftPanel } = useLeftSidebar();

  const handleClickSettings = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  const handleClickNewNote = () => {
    navigate({
      to: "/app/main",
      search: { ...search, new: true },
    });
  };

  return (
    <header
      data-tauri-drag-region
      className={clsx([
        "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
        "border-border bg-neutral-50",
        "pl-[82px]",
      ])}
    >
      {!isLeftPanelExpanded
        && (
          <PanelLeftOpenIcon
            onClick={toggleLeftPanel}
            className="cursor-pointer h-5 w-5"
          />
        )}

      <div
        className="flex items-center justify-start gap-2"
        data-tauri-drag-region
      >
        <CogIcon
          onClick={handleClickSettings}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />
        <PencilIcon
          onClick={handleClickNewNote}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />
        <CalendarIcon
          onClick={() => openNew({ type: "calendars", id: id(), active: true })}
          className="cursor-pointer h-5 w-5 text-muted-foreground hover:text-foreground"
        />
      </div>

      <ChatPanelButton
        isExpanded={isRightPanelExpanded}
        togglePanel={toggleRightPanel}
      />
    </header>
  );
}

function TabsHeader({ tabs }: { tabs: Tab[] }) {
  const { select, close } = useTabs();

  return (
    <ScrollArea className="w-full border-b whitespace-nowrap">
      <div className="flex w-max gap-1">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={tab.active}
            handleSelect={select}
            handleClose={close}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function TabItem(
  { tab, active, handleSelect, handleClose }: {
    tab: Tab;
    active: boolean;
    handleSelect: (tab: Tab) => void;
    handleClose: (tab: Tab) => void;
  },
) {
  const title = persisted.UI.useCell("sessions", tab.id, "title", persisted.STORE_ID);

  return (
    <div
      className={clsx([
        "flex items-center gap-2 shrink-0",
        "border-x rounded px-3 py-1.5",
        active
          ? "border-border bg-background text-foreground"
          : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground",
      ])}
    >
      <button
        onClick={() => handleSelect(tab)}
        className="flex flex-row items-center gap-1 text-sm max-w-[140px]"
      >
        <span className="flex-shrink-0">
          {tab.type === "sessions"
            ? <StickyNoteIcon className="w-4 h-4" />
            : tab.type === "calendars"
            ? <CalendarIcon className="w-4 h-4" />
            : tab.type === "humans"
            ? <UserIcon className="w-4 h-4" />
            : tab.type === "events"
            ? <CalendarIcon className="w-4 h-4" />
            : tab.type === "organizations"
            ? <Building2Icon className="w-4 h-4" />
            : <></>}
        </span>
        <span className="truncate">{title}</span>
      </button>
      {active && (
        <button
          onClick={() => handleClose(tab)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }

  if (tab.type === "calendars") {
    return <TabContentCalendar tab={tab} />;
  }

  return null;
}

function TabContentNote({ tab }: { tab: Tab }) {
  const row = persisted.UI.useRow("sessions", tab.id, persisted.STORE_ID);

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    tab.id,
    (input: string, _store) => ({ ...row, title: input }),
    [row],
    persisted.STORE_ID,
  );

  const handleEditRawMd = persisted.UI.useSetRowCallback(
    "sessions",
    tab.id,
    (input: string, _store) => ({ ...row, raw_md: input }),
    [row],
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-2 px-2 pt-2">
      <TitleInput
        editable={true}
        value={row.title ?? ""}
        onChange={(e) => handleEditTitle(e.target.value)}
      />
      <NoteEditor
        initialContent={row.raw_md ?? ""}
        handleChange={(e) => handleEditRawMd(e)}
        mentionConfig={{
          trigger: "@",
          handleSearch: async () => {
            return [];
          },
        }}
      />
    </div>
  );
}

function TabContentCalendar(_: { tab: Tab }) {
  const slices = persisted.UI.useSliceIds(persisted.INDEXES.eventsByMonth, persisted.STORE_ID);

  return (
    <div className="flex flex-col h-full">
      {slices.map((sliceId) => <TabContentCalendarMonth key={sliceId} sliceId={sliceId} />)}
    </div>
  );
}

function TabContentCalendarMonth({ sliceId }: { sliceId: string }) {
  const rowIds = persisted.UI.useSliceRowIds(persisted.INDEXES.eventsByMonth, sliceId, persisted.STORE_ID);

  return (
    <div>
      {rowIds.map((rowId) => <TabContentCalendarMonthDay key={rowId} rowId={rowId} />)}
    </div>
  );
}

function TabContentCalendarMonthDay({ rowId }: { rowId: string }) {
  const row = persisted.UI.useRow("events", rowId, persisted.STORE_ID);

  return <pre>{JSON.stringify(row, null, 2)}</pre>;
}
