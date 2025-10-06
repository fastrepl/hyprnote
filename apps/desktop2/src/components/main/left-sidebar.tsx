import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChartNoAxesGantt, FolderOpenIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useCell, useRowIds, useSliceRowIds } from "tinybase/ui-react";

import * as persisted from "../../tinybase/store/persisted";

import { ContextMenuItem } from "@hypr/ui/components/ui/context-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { useTabs } from "../../hooks/useTabs";
import { Tab } from "../../types";
import { InteractiveButton } from "../interactive-button";

export function LeftSidebar() {
  return (
    <div className="h-full border-r w-full flex flex-col overflow-hidden">
      <Tabs defaultValue="timeline" className="flex flex-col flex-1 overflow-hidden">
        <TabsList
          data-tauri-drag-region
          className={clsx([
            "flex flex-row shrink-0",
            "flex w-full items-center justify-between min-h-11 py-1 px-2 border-b",
            "border-border bg-neutral-50",
            "pl-[72px]",
          ])}
        >
          <TabsTrigger value="folder" className="flex-1">
            <FolderOpenIcon />
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1">
            <ChartNoAxesGantt />
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1">
            <SearchIcon />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 mt-0 h-0">
          <div className="h-full overflow-y-auto p-2">
            <TimelineView />
          </div>
        </TabsContent>

        <TabsContent value="folder" className="flex-1 mt-0 h-0">
          <div className="h-full overflow-y-auto p-2">
            <FolderView />
          </div>
        </TabsContent>

        <TabsContent value="search" className="flex-1 mt-0 h-0">
          <div className="h-full flex flex-col overflow-hidden">
            <SearchView />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineView() {
  const allSessionIds = useRowIds("sessions", persisted.STORE_ID);

  return (
    <div className="flex flex-col">
      {allSessionIds?.map((sessionId) => <SessionItem key={sessionId} sessionId={sessionId} />)}
    </div>
  );
}

function SearchView() {
  return (
    <>
      <div className="sticky top-0 bg-white z-10 p-2 border-b">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {/* Search results will go here */}
      </div>
    </>
  );
}

function FolderView() {
  const rootFolderIds = useSliceRowIds(persisted.INDEXES.foldersByParent, "", persisted.STORE_ID);
  const rootSessionIds = useSliceRowIds(persisted.INDEXES.sessionsByFolder, "", persisted.STORE_ID);

  return (
    <div className="flex flex-col">
      {rootFolderIds?.map((folderId) => <FolderTreeItem key={folderId} folderId={folderId} />)}

      {rootSessionIds?.map((sessionId) => <SessionItemNested key={sessionId} sessionId={sessionId} depth={0} />)}
    </div>
  );
}

function FolderTreeItem({ folderId, depth = 0 }: { folderId: string; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const name = useCell("folders", folderId, "name", persisted.STORE_ID);
  const sessionIds = useSliceRowIds(persisted.INDEXES.sessionsByFolder, folderId, persisted.STORE_ID);
  const subFolderIds = useSliceRowIds(persisted.INDEXES.foldersByParent, folderId, persisted.STORE_ID);

  const hasChildren = (sessionIds && sessionIds.length > 0) || (subFolderIds && subFolderIds.length > 0);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-2 py-1 hover:bg-gray-100 flex items-center gap-1"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="w-4 text-gray-500 text-xs">
          {hasChildren && (isOpen ? "▼" : "▶")}
        </span>
        <span className="font-medium">{name}</span>
      </button>

      {isOpen && (
        <>
          {sessionIds?.map((sessionId) => (
            <SessionItemNested key={sessionId} sessionId={sessionId} depth={depth + 1} />
          ))}

          {subFolderIds?.map((subId) => <FolderTreeItem key={subId} folderId={subId} depth={depth + 1} />)}
        </>
      )}
    </div>
  );
}

function SessionItem({ sessionId, active }: { sessionId: string; active?: boolean }) {
  const title = useCell("sessions", sessionId, "title", persisted.STORE_ID);
  const tab: Tab = { id: sessionId, type: "note", active: false };

  const { openCurrent, openNew } = useTabs();

  const contextMenu = (
    <>
      <ContextMenuItem onClick={() => console.log("Delete session:", sessionId)}>
        Delete
      </ContextMenuItem>
    </>
  );

  return (
    <InteractiveButton
      onClick={() => openCurrent(tab)}
      onCmdClick={() => openNew(tab)}
      contextMenu={contextMenu}
      className={clsx([
        "w-full text-left px-2 py-1 hover:bg-blue-50 border-b border-gray-100",
        active && "bg-blue-50",
      ])}
    >
      <div className="text-sm font-medium truncate">{title}</div>
    </InteractiveButton>
  );
}

function SessionItemNested({ sessionId, depth, active }: { sessionId: string; depth: number; active?: boolean }) {
  const title = useCell("sessions", sessionId, "title", persisted.STORE_ID);
  const tab: Tab = { id: sessionId, type: "note", active: true };

  return (
    <Link to="/app/main" search={{ tabs: [tab] }}>
      <div
        className={clsx([
          "px-2 py-1 hover:bg-blue-50 flex items-center gap-1",
          active && "bg-blue-50",
        ])}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="w-4"></span>
        <div className="text-sm truncate">{title}</div>
      </div>
    </Link>
  );
}
