import { useNavigate, useSearch } from "@tanstack/react-router";
import { clsx } from "clsx";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, startOfMonth } from "date-fns";
import { CalendarIcon, CogIcon, NotebookIcon, PanelLeftOpenIcon, PencilIcon, StickyNoteIcon } from "lucide-react";
import { Reorder } from "motion/react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import NoteEditor from "@hypr/tiptap/editor";
import { CalendarStructure } from "@hypr/ui/components/block/calendar-structure";
import { TabHeader } from "@hypr/ui/components/block/tab-header";
import TitleInput from "@hypr/ui/components/block/title-input";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { useTabs } from "../../hooks/useTabs";
import * as persisted from "../../tinybase/store/persisted";
import { rowIdfromTab, type Tab, uniqueIdfromTab } from "../../types";

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
  // const { isExpanded: isRightPanelExpanded, togglePanel: toggleRightPanel } = useRightPanel();
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
    </header>
  );
}

function TabsHeader({ tabs }: { tabs: Tab[] }) {
  const { select, close, reorder } = useTabs();

  return (
    <div className="w-full border-b overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Reorder.Group
        as="div"
        axis="x"
        values={tabs}
        onReorder={reorder}
        className="flex w-max gap-1"
        layoutScroll
      >
        {tabs.map((tab) => (
          <Reorder.Item
            key={uniqueIdfromTab(tab)}
            value={tab}
            as="div"
            style={{ position: "relative" }}
          >
            <TabItem tab={tab} handleClose={close} handleSelect={select} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

function TabItem(
  { tab, handleClose, handleSelect }: { tab: Tab; handleClose: (tab: Tab) => void; handleSelect: (tab: Tab) => void },
) {
  if (tab.type === "sessions") {
    return <TabItemNote tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "events") {
    return <TabItemEvent tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "calendars") {
    return <TabItemCalendar tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  return null;
}

const TabItemNote: TabItem = ({ tab, handleClose, handleSelect }) => {
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
};

const TabItemEvent: TabItem = ({ tab, handleClose, handleSelect }) => {
  const title = persisted.UI.useCell("events", rowIdfromTab(tab), "title", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<CalendarIcon className="w-4 h-4" />}
      title={title ?? ""}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

const TabItemCalendar: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<CalendarIcon className="w-4 h-4" />}
      title={"Calendar"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

type TabItem = (props: {
  tab: Tab;
  handleClose: (tab: Tab) => void;
  handleSelect: (tab: Tab) => void;
}) => React.ReactNode;

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
        "flex items-center gap-2 min-w-[100px] max-w-[200px]",
        "border-x rounded px-3 py-1.5",
        active
          ? "border-border bg-background text-foreground"
          : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground",
      ])}
    >
      <button
        onClick={() => handleSelect()}
        className="flex flex-row items-center gap-1 text-sm flex-1 min-w-0"
      >
        <span className="flex-shrink-0">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </button>
      <button
        onClick={() => handleClose()}
        className={clsx([
          "text-xs flex-shrink-0",
          active
            ? "text-muted-foreground hover:text-foreground"
            : "opacity-0 pointer-events-none",
        ])}
      >
        ✕
      </button>
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  if (tab.type === "sessions") {
    return <TabContentNote tab={tab} />;
  }

  if (tab.type === "events") {
    return <TabContentEvent tab={tab} />;
  }

  if (tab.type === "calendars") {
    return <TabContentCalendar tab={tab} />;
  }

  return null;
}

function TabContentNote({ tab }: { tab: Tab }) {
  const sessionId = rowIdfromTab(tab);
  const sessionRow = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...sessionRow, title: input }),
    [sessionRow],
    persisted.STORE_ID,
  );

  const handleEditRawMd = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...sessionRow, raw_md: input }),
    [sessionRow],
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-2 px-2 pt-2">
      <TabContentNoteHeader sessionRow={sessionRow} />
      <TitleInput
        editable={true}
        value={sessionRow.title ?? ""}
        onChange={(e) => handleEditTitle(e.target.value)}
      />
      <TabHeader
        isEnhancing={false}
        onVisibilityChange={() => {}}
        currentTab="raw"
        onTabChange={() => {}}
        isCurrentlyRecording={false}
        shouldShowTab={true}
        shouldShowEnhancedTab={false}
      />
      <NoteEditor
        initialContent={sessionRow.raw_md ?? ""}
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

function TabContentNoteHeader({ sessionRow }: { sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">> }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {sessionRow.folder_id && (
          <TabContentNoteHeaderFolderChain
            title={sessionRow.title ?? ""}
            folderId={sessionRow.folder_id}
          />
        )}
      </div>

      {sessionRow.event_id && <TabContentNoteHeaderEvent eventId={sessionRow.event_id} />}
    </div>
  );
}

function TabContentNoteHeaderFolderChain({ title, folderId }: { title: string; folderId: string }) {
  const folderIds = persisted.UI.useLinkedRowIds(
    "folderToParentFolder",
    folderId,
    persisted.STORE_ID,
  );

  if (!folderIds || folderIds.length === 0) {
    return null;
  }

  const folderChain = [...folderIds].reverse();

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {folderChain.map((id, index) => (
        <div key={id} className="flex items-center gap-1">
          {index > 0 && <span>/</span>}
          <TabContentNoteHeaderFolder folderId={id} />
        </div>
      ))}
      <div className="flex items-center gap-1">
        <span>/</span>
        <span className="truncate max-w-[60px]">{title}</span>
      </div>
    </div>
  );
}

function TabContentNoteHeaderFolder({ folderId }: { folderId: string }) {
  const folderName = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);
  return <span>{folderName}</span>;
}

function TabContentNoteHeaderEvent({ eventId }: { eventId: string }) {
  const eventRow = persisted.UI.useRow("events", eventId, persisted.STORE_ID);
  return <div>{eventRow.title}</div>;
}

function TabContentEvent({ tab }: { tab: Tab }) {
  const id = rowIdfromTab(tab);
  const event = persisted.UI.useRow("events", id, persisted.STORE_ID);

  return <pre>{JSON.stringify(event, null, 2)}</pre>;
}

function TabContentCalendar({ tab }: { tab: Tab }) {
  if (tab.type !== "calendars") {
    return null;
  }

  const { openCurrent } = useTabs();
  const monthStart = startOfMonth(tab.month);
  const monthEnd = endOfMonth(tab.month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => format(day, "yyyy-MM-dd"));
  const startDayOfWeek = getDay(monthStart);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePreviousMonth = () => {
    openCurrent({ ...tab, month: addMonths(tab.month, -1) });
  };

  const handleNextMonth = () => {
    openCurrent({ ...tab, month: addMonths(tab.month, 1) });
  };

  const handleToday = () => {
    openCurrent({ ...tab, month: new Date() });
  };

  return (
    <CalendarStructure
      monthLabel={format(tab.month, "MMMM yyyy")}
      weekDays={weekDays}
      startDayOfWeek={startDayOfWeek}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onToday={handleToday}
    >
      {days.map((day) => (
        <TabContentCalendarDay key={day} day={day} isCurrentMonth={isSameMonth(new Date(day), tab.month)} />
      ))}
    </CalendarStructure>
  );
}

function TabContentCalendarDay({ day, isCurrentMonth }: { day: string; isCurrentMonth: boolean }) {
  const eventIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.eventsByDate,
    day,
    persisted.STORE_ID,
  );

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionByDateWithEvent,
    day,
    persisted.STORE_ID,
  );

  const dayNumber = format(new Date(day), "d");
  const isToday = format(new Date(), "yyyy-MM-dd") === day;
  const dayOfWeek = getDay(new Date(day));
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <div
      className={clsx([
        "h-32 relative flex flex-col border-b border-neutral-200",
        isWeekend ? "bg-neutral-50" : "bg-white",
      ])}
    >
      <div className="flex items-center justify-end px-1 text-sm h-8">
        <div className={clsx("flex items-end gap-1", isToday && "items-center")}>
          <div
            className={clsx(
              isToday && "bg-red-500 rounded-full w-6 h-6 flex items-center justify-center",
            )}
          >
            <span
              className={clsx(
                isToday
                  ? "text-white font-medium"
                  : !isCurrentMonth
                  ? "text-neutral-400"
                  : isWeekend
                  ? "text-neutral-500"
                  : "text-neutral-700",
              )}
            >
              {dayNumber}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-1">
        <div className="space-y-1">
          {eventIds.map((eventId) => <TabContentCalendarDayEvents key={eventId} eventId={eventId} />)}
          {sessionIds.map((sessionId) => <TabContentCalendarDaySessions key={sessionId} sessionId={sessionId} />)}
        </div>
      </div>
    </div>
  );
}

function TabContentCalendarDayEvents({ eventId }: { eventId: string }) {
  const event = persisted.UI.useRow("events", eventId, persisted.STORE_ID);

  return (
    <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
      <CalendarIcon className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
      <div className="flex-1 text-xs text-neutral-800 truncate">
        {event.title}
      </div>
    </div>
  );
}

function TabContentCalendarDaySessions({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  return (
    <div className="flex items-center space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
      <NotebookIcon className="w-2.5 h-2.5 text-neutral-500 flex-shrink-0" />
      <div className="flex-1 text-xs text-neutral-800 truncate">
        {session.title}
      </div>
    </div>
  );
}
