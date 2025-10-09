import { useRouteContext } from "@tanstack/react-router";
import { clsx } from "clsx";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CogIcon,
  FolderIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  StickyNoteIcon,
} from "lucide-react";
import { Reorder } from "motion/react";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import NoteEditor from "@hypr/tiptap/editor";
import { ChatPanelButton } from "@hypr/ui/components/block/chat-panel-button";
import TitleInput from "@hypr/ui/components/block/title-input";
import { Button } from "@hypr/ui/components/ui/button";
import { useLeftSidebar, useRightPanel } from "@hypr/utils/contexts";
import * as persisted from "../../store/tinybase/persisted";
import { useTabs } from "../../store/zustand/tabs";
import { rowIdfromTab, type Tab, uniqueIdfromTab } from "../../store/zustand/tabs";

export function MainContent() {
  const { tabs, currentTab } = useTabs();

  if (!currentTab) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <TabsHeader tabs={tabs} />
      <TabContent tab={currentTab} />
    </div>
  );
}

export function MainHeader() {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });
  const { isExpanded: isRightPanelExpanded, togglePanel: toggleRightPanel } = useRightPanel();
  const { isExpanded: isLeftPanelExpanded, togglePanel: toggleLeftPanel } = useLeftSidebar();
  const { openNew } = useTabs();

  const handleClickSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
  }, []);

  const handleClickNewNote = useCallback(() => {
    if (!persistedStore || !internalStore) {
      return;
    }

    const sessionId = crypto.randomUUID();
    const user_id = internalStore.getValue("user_id");

    persistedStore.setRow("sessions", sessionId, {
      title: "new",
      user_id,
      created_at: new Date().toISOString(),
    });
    openNew({ id: sessionId, type: "sessions", active: true });
  }, [persistedStore, internalStore, openNew]);

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

        <FolderIcon
          onClick={() => openNew({ type: "folders", id: null, active: true })}
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
  if (tab.type === "folders") {
    return <TabItemFolder tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
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

const TabItemFolder: TabItem = ({ tab, handleClose, handleSelect }) => {
  if (tab.type === "folders" && tab.id === null) {
    return <TabItemFolderAll tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  if (tab.type === "folders" && tab.id !== null) {
    return <TabItemFolderSpecific tab={tab} handleClose={handleClose} handleSelect={handleSelect} />;
  }

  return null;
};

const TabItemFolderAll: TabItem = ({ tab, handleClose, handleSelect }) => {
  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={"Folder"}
      active={tab.active}
      handleClose={() => handleClose(tab)}
      handleSelect={() => handleSelect(tab)}
    />
  );
};

const TabItemFolderSpecific: TabItem = ({ tab, handleClose, handleSelect }) => {
  if (tab.type !== "folders" || tab.id === null) {
    return null;
  }

  const folderName = persisted.UI.useCell("folders", tab.id, "name", persisted.STORE_ID);

  return (
    <TabItemBase
      icon={<FolderIcon className="w-4 h-4" />}
      title={folderName ?? ""}
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

  if (tab.type === "folders") {
    return <TabContentFolder tab={tab} />;
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
  const startDayOfWeek = getDay(monthStart); // 0 = Sunday, 6 = Saturday
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
    <div className="flex flex-col h-full p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xl font-semibold">
          {format(tab.month, "MMMM yyyy")}
        </div>
        <div className="flex h-fit rounded-md overflow-clip border border-neutral-200">
          <Button
            variant="outline"
            className="p-0.5 rounded-none border-none"
            onClick={handlePreviousMonth}
          >
            <ChevronLeftIcon size={16} />
          </Button>

          <Button
            variant="outline"
            className="text-sm px-1 py-0.5 rounded-none border-none"
            onClick={handleToday}
          >
            Today
          </Button>

          <Button
            variant="outline"
            className="p-0.5 rounded-none border-none"
            onClick={handleNextMonth}
          >
            <ChevronRightIcon size={16} />
          </Button>
        </div>
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

function TabContentFolder({ tab }: { tab: Tab }) {
  if (tab.type !== "folders") {
    return null;
  }

  // If tab.id is null, show top-level folders
  if (tab.id === null) {
    return <TabContentFolderTopLevel />;
  }

  // If tab.id is a folder, show that folder's contents
  return <TabContentFolderSpecific folderId={tab.id} />;
}

function TabContentFolderTopLevel() {
  const topLevelFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    "",
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">All Folders</h2>
      <div className="grid grid-cols-4 gap-4">
        {topLevelFolderIds?.map((folderId) => <FolderCard key={folderId} folderId={folderId} />)}
      </div>
    </div>
  );
}

function FolderCard({ folderId }: { folderId: string }) {
  const folder = persisted.UI.useRow("folders", folderId, persisted.STORE_ID);
  const { openCurrent } = useTabs();

  // Count children
  const childFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    folderId,
    persisted.STORE_ID,
  );

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionsByFolder,
    folderId,
    persisted.STORE_ID,
  );

  const childCount = (childFolderIds?.length ?? 0) + (sessionIds?.length ?? 0);

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-6 border rounded-lg hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "folders", id: folderId, active: true })}
    >
      <FolderIcon className="w-12 h-12 text-muted-foreground" />
      <span className="text-sm font-medium text-center">{folder.name}</span>
      {childCount > 0 && <span className="text-xs text-muted-foreground">{childCount} items</span>}
    </div>
  );
}

function TabContentFolderSpecific({ folderId }: { folderId: string }) {
  const childFolderIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.foldersByParent,
    folderId,
    persisted.STORE_ID,
  );

  const sessionIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.sessionsByFolder,
    folderId,
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <TabContentFolderBreadcrumb folderId={folderId} />

      {(childFolderIds?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders</h3>
          <div className="grid grid-cols-4 gap-4">
            {childFolderIds!.map((childId) => <FolderCard key={childId} folderId={childId} />)}
          </div>
        </div>
      )}

      {(sessionIds?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
          <div className="space-y-2">
            {sessionIds!.map((sessionId) => <FolderSessionItem key={sessionId} sessionId={sessionId} />)}
          </div>
        </div>
      )}

      {(childFolderIds?.length ?? 0) === 0 && (sessionIds?.length ?? 0) === 0 && (
        <div className="text-center text-muted-foreground py-8">
          This folder is empty
        </div>
      )}
    </div>
  );
}

function TabContentFolderBreadcrumb({ folderId }: { folderId: string }) {
  const { openCurrent } = useTabs();

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
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
      <button
        onClick={() => openCurrent({ type: "folders", id: null, active: true })}
        className="hover:text-foreground"
      >
        Root
      </button>
      {folderChain.map((id) => {
        const isLast = id === folderId;
        return (
          <div key={id} className="flex items-center gap-2">
            <span>/</span>
            <button
              onClick={() => !isLast && openCurrent({ type: "folders", id, active: true })}
              className={isLast ? "text-foreground font-medium" : "hover:text-foreground"}
            >
              <TabContentFolderBreadcrumbItem folderId={id} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TabContentFolderBreadcrumbItem({ folderId }: { folderId: string }) {
  const folderName = persisted.UI.useCell("folders", folderId, "name", persisted.STORE_ID);
  return <span>{folderName}</span>;
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);
  const { openCurrent } = useTabs();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted cursor-pointer"
      onClick={() => openCurrent({ type: "sessions", id: sessionId, active: true })}
    >
      <StickyNoteIcon className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm">{session.title}</span>
    </div>
  );
}
