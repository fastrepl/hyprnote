import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { useState } from "react";
import { useCell, useRowIds, useSliceRowIds } from "tinybase/ui-react";

import * as persisted from "../tinybase/store/persisted";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { Tab } from "../types";

export function Sidebar() {
  return (
    <div className="h-screen border-r w-[300px]">
      <Tabs defaultValue="timeline" className="h-full flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
          <TabsTrigger value="folder" className="flex-1">Folders</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 overflow-auto p-2 mt-0">
          <TimelineView />
        </TabsContent>

        <TabsContent value="folder" className="flex-1 overflow-auto p-2 mt-0">
          <FolderView />
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
  const tab: Tab = { id: sessionId, type: "note" };

  return (
    <Link to="/app/main" search={{ activeTab: tab }}>
      <div
        className={clsx([
          "px-2 py-1 hover:bg-blue-50 border-b border-gray-100",
          active && "bg-blue-50",
        ])}
      >
        <div className="text-sm font-medium truncate">{title}</div>
      </div>
    </Link>
  );
}

function SessionItemNested({ sessionId, depth, active }: { sessionId: string; depth: number; active?: boolean }) {
  const title = useCell("sessions", sessionId, "title", persisted.STORE_ID);
  const tab: Tab = { id: sessionId, type: "note" };

  return (
    <Link to="/app/main" search={{ activeTab: tab }}>
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
