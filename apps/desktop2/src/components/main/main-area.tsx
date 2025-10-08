import { useNavigate, useSearch } from "@tanstack/react-router";
import { clsx } from "clsx";
import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { CalendarIcon, CogIcon, PanelLeftOpenIcon, PencilIcon, StickyNoteIcon } from "lucide-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import NoteEditor from "@hypr/tiptap/editor";
import { ChatPanelButton } from "@hypr/ui/components/block/chat-panel-button";
import TitleInput from "@hypr/ui/components/block/title-input";
import { ScrollArea, ScrollBar } from "@hypr/ui/components/ui/scroll-area";
import { useLeftSidebar, useRightPanel } from "@hypr/utils/contexts";
import { useTabs } from "../../hooks/useTabs";
import * as persisted from "../../tinybase/store/persisted";
import { rowIdfromTab, Tab, uniqueIdfromTab } from "../../types";

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
          onClick={() => openNew({ type: "calendars", month: new Date(), active: true })}
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
        {tabs.map((tab) => <TabItem key={uniqueIdfromTab(tab)} tab={tab} handleClose={close} handleSelect={select} />)}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function TabItem(
  { tab, handleClose, handleSelect }: { tab: Tab; handleClose: (tab: Tab) => void; handleSelect: (tab: Tab) => void },
) {
  if (tab.type === "sessions") {
    return <TabItemNote tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "calendars") {
    return <TabItemCalendar tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  return null;
}

function TabItemNote(
  { tab, handleClose, handleSelect }: {
    tab: Tab;
    handleClose: (tab: Tab) => void;
    handleSelect: (tab: Tab) => void;
  },
) {
  const title = persisted.UI.useCell("sessions", rowIdfromTab(tab), "title", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<StickyNoteIcon className="w-4 h-4" />}
      title={title ?? ""}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
}

function TabItemCalendar(
  { tab, handleClose, handleSelect }: {
    tab: Tab;
    handleClose: (tab: Tab) => void;
    handleSelect: (tab: Tab) => void;
  },
) {
  return (
    <TabItemBase
      icon={<CalendarIcon className="w-4 h-4" />}
      title={"Calendar"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
}

function TabItemBase(
  { icon, title, active, handleClose, handleSelect }: {
    icon: React.ReactNode;
    title: string;
    active: boolean;
    handleClose: () => void;
    handleSelect: () => void;
  },
) {
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
        onClick={() => handleSelect()}
        className="flex flex-row items-center gap-1 text-sm max-w-[140px]"
      >
        <span className="flex-shrink-0">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </button>
      {active && (
        <button
          onClick={() => handleClose()}
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
  const id = rowIdfromTab(tab);
  const row = persisted.UI.useRow("sessions", id, persisted.STORE_ID);

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    id,
    (input: string, _store) => ({ ...row, title: input }),
    [row],
    persisted.STORE_ID,
  );

  const handleEditRawMd = persisted.UI.useSetRowCallback(
    "sessions",
    id,
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

function TabContentCalendar({ tab }: { tab: Tab }) {
  if (tab.type !== "calendars") {
    return null;
  }
  const monthStart = startOfMonth(tab.month);
  const monthEnd = endOfMonth(tab.month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => format(day, "yyyy-MM-dd"));
  const startDayOfWeek = getDay(monthStart); // 0 = Sunday, 6 = Saturday
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4 text-xl font-semibold">
        {format(tab.month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
        {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => <TabContentCalendarDay key={day} day={day} />)}
      </div>
    </div>
  );
}

function TabContentCalendarDay({ day }: { day: string }) {
  const eventIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.eventsByDate,
    day,
    persisted.STORE_ID,
  );

  const dayNumber = format(new Date(day), "d");
  const isToday = format(new Date(), "yyyy-MM-dd") === day;

  return (
    <div
      className={clsx([
        "h-32 max-h-32 p-2 border rounded-md flex flex-col overflow-hidden",
        isToday ? "bg-blue-50 border-blue-300" : "bg-background border-border",
      ])}
    >
      <div
        className={clsx([
          "text-sm font-medium mb-1 flex-shrink-0",
          isToday && "text-blue-600",
        ])}
      >
        {dayNumber}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {eventIds?.map((rowId) => <TabContentCalendarDayEvent key={rowId} rowId={rowId} />)}
      </div>
    </div>
  );
}

function TabContentCalendarDayEvent({ rowId }: { rowId: string }) {
  const event = persisted.UI.useRow("events", rowId, persisted.STORE_ID);
  return <div className="text-xs bg-blue-100 px-1.5 py-0.5 rounded truncate">{event.title}</div>;
}
